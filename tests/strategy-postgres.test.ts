import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";
vi.mock("@/modules/auth/server", () => ({
  auth: () => {
    throw new Error("Unused in domain tests");
  },
}));
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  createGuestSession,
  generateGuest,
  readGuest,
  claimGuest,
} from "@/modules/guest/service";
import {
  generateRevision,
  readRevisions,
  approveRevision,
} from "@/modules/strategy/service";
import { cleanupGuests } from "@/modules/guest/cleanup";
import * as provider from "@/modules/strategy/provider";
import { ProviderOutputError } from "@/modules/analysis/provider";
const connection = process.env.TEST_DATABASE_URL;
describe.skipIf(!connection)("strategy revision PostgreSQL integration", () => {
  beforeAll(() => {
    if (
      !connection?.startsWith(
        "postgresql://firstcustomers_test@127.0.0.1:55439/",
      )
    )
      throw new Error("Only isolated localhost test DB allowed");
    for (const [k, v] of Object.entries({
      DATABASE_URL: connection,
      APP_URL: "http://localhost:3000",
      NEON_AUTH_BASE_URL: "https://auth.example.com/auth",
      NEON_AUTH_COOKIE_SECRET: "test-cookie-secret-at-least-32-characters",
      MOCK_ANALYSIS: "true",
      OPENAI_MODEL: "gpt-4.1-mini",
      GUEST_ANALYSIS_ENABLED: "true",
      GUEST_IP_MODE: "local",
      GUEST_IP_HASH_SECRET: "t".repeat(48),
      TURNSTILE_SECRET_KEY: "unit-test-secret-key",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "unit-test-site-key",
      GUEST_PRICED_MODEL: "gpt-4.1-mini",
      GUEST_INPUT_USD_PER_MILLION: "0.4",
      GUEST_OUTPUT_USD_PER_MILLION: "1.6",
      GUEST_MAX_COST_USD: "0.03",
      STRATEGY_REFINEMENT_ENABLED: "true",
    }))
      vi.stubEnv(k, v);
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db().usageBucket.deleteMany({
      where: { key: { startsWith: "guest:" } },
    });
    await db().strategyRevision.updateMany({
      where: { status: "RUNNING" },
      data: { status: "FAILED" },
    });
    await db().analysisRun.updateMany({
      where: { status: "RUNNING" },
      data: { status: "FAILED" },
    });
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await db().$disconnect();
  });
  async function guest() {
    const s = await createGuestSession(undefined, randomUUID());
    await generateGuest(
      s.token,
      `https://${randomUUID()}.example.com`,
      randomUUID(),
    );
    return { s, a: { token: s.token, ipHash: randomUUID() } };
  }
  async function owner() {
    const id = randomUUID();
    await db().user.create({ data: { id, email: `${id}@example.com` } });
    const org = await db().organization.create({
      data: {
        name: "Strategy test",
        slug: id,
        ownerId: id,
        memberships: { create: { userId: id } },
      },
    });
    return { organizationId: org.id, userId: id };
  }
  const context = {
    payingCustomers: "0",
    weeklyTime: "Less than 1 hour",
    monthlyBudget: 0,
    currency: "USD",
  };
  it("preserves guest original facts, deduplicates attempts and securely claims all revisions", async () => {
    const { s, a } = await guest(),
      before = await readGuest(s.token);
    const id = await generateRevision(a, context);
    expect(await generateRevision(a, context)).toBe(id);
    expect((await readGuest(s.token)).output).toEqual(before.output);
    const r = await readRevisions(a);
    expect(r.revisions).toHaveLength(1);
    expect(r.revisions[0].output).toHaveProperty("schemaVersion", "2.0");
    await expect(
      generateRevision(a, { ...context, monthlyBudget: 1 }),
    ).rejects.toMatchObject({ status: 429 });
    const t = await owner(),
      saved = await claimGuest(s.token, t),
      access = { tenant: t, analysisId: saved.analysisId };
    expect((await readRevisions(access)).revisions[0].id).toBe(id);
    await approveRevision(access, id);
    expect((await readRevisions(access)).revisions[0].approved).toBe(true);
    await expect(readRevisions(a)).rejects.toMatchObject({ status: 404 });
    await expect(
      readRevisions({ tenant: await owner(), analysisId: saved.analysisId }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(claimGuest(s.token, await owner())).rejects.toMatchObject({
      status: 404,
    });
  });
  it("retains failed generation costs without damaging the original and permits one retry", async () => {
    const { a, s } = await guest(),
      before = await readGuest(s.token);
    const spy = vi
      .spyOn(provider, "refineStrategy")
      .mockRejectedValueOnce(new ProviderOutputError(120, 40));
    await expect(generateRevision(a, context)).rejects.toMatchObject({
      status: 502,
    });
    spy.mockRestore();
    const history = await readRevisions(a);
    expect(history.revisions[0]).toMatchObject({
      status: "FAILED",
      inputTokens: 120,
      outputTokens: 40,
    });
    expect(history.revisions[0].estimatedCost).not.toBeNull();
    await generateRevision(a, context);
    expect((await readRevisions(a)).revisions.map((r) => r.status)).toEqual([
      "SUCCEEDED",
      "FAILED",
    ]);
    expect((await readGuest(s.token)).output).toEqual(before.output);
  });
  it("serializes concurrent guest refinements and enforces expiry and cleanup", async () => {
    const { a, s } = await guest();
    const results = await Promise.allSettled([
      generateRevision(a, context),
      generateRevision(a, { ...context, monthlyBudget: 2 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const run = await db().analysisRun.findFirstOrThrow({
      where: { guestSessionId: s.session.id },
    });
    await db().guestAnalysisSession.update({
      where: { id: s.session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(readRevisions(a)).rejects.toMatchObject({ status: 404 });
    await cleanupGuests();
    expect(
      await db().strategyRevision.count({ where: { analysisId: run.id } }),
    ).toBe(0);
  });
  it("preserves signed-in revision and approval history across further refinements", async () => {
    const { s } = await guest(),
      t = await owner(),
      saved = await claimGuest(s.token, t),
      a = { tenant: t, analysisId: saved.analysisId };
    const first = await generateRevision(a, context);
    await approveRevision(a, first);
    const second = await generateRevision(a, {
      ...context,
      payingCustomers: "More than 200",
      weeklyTime: "More than 10 hours",
      monthlyBudget: 5000,
    });
    const history = await readRevisions(a);
    expect(history.revisions).toHaveLength(2);
    expect(history.revisions.find((r) => r.id === first)?.approved).toBe(true);
    await approveRevision(a, second);
    expect(
      (await readRevisions(a)).revisions.find((r) => r.id === second)?.approved,
    ).toBe(true);
    expect(
      await db().strategyApproval.count({
        where: { productId: saved.productId },
      }),
    ).toBe(2);
    const original = (await readRevisions(a)).revisions[0].output;
    const edited = structuredClone(
      original,
    ) as unknown as import("@/modules/strategy/schema").Strategy;
    edited.executiveSummary = "Founder-edited acquisition priorities";
    const third = await approveRevision(a, second, edited);
    const final = await readRevisions(a);
    expect(final.revisions).toHaveLength(3);
    expect(final.revisions.find((r) => r.id === third)).toMatchObject({
      approved: true,
      output: { executiveSummary: "Founder-edited acquisition priorities" },
    });
    expect(final.revisions.find((r) => r.id === second)?.output).toEqual(
      original,
    );
    await expect(approveRevision(a, second, edited)).rejects.toMatchObject({
      status: 409,
    });
  });
});
