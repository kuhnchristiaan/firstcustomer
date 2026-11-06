import { it, expect, vi, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/modules/auth/server", () => ({
  auth: () => {
    throw new Error("No auth bypass in domain integration tests");
  },
}));
import { db } from "@/lib/db";
import {
  createGuestSession,
  claimGuest,
  reserveGuestAnalysis,
} from "@/modules/guest/service";
import {
  generateGuestAdvisor,
  readGuestAdvisor,
} from "@/modules/advisor/guest-service";
import {
  advisorWorkspace,
  advisorView,
  completeTask,
} from "@/modules/advisor/service";
import { emptyContext } from "@/modules/advisor/schema";
import { mockReport } from "@/modules/analysis/mock";
const target = process.env.ADVISOR_TEST_DATABASE_URL;
afterAll(async () => {
  vi.unstubAllEnvs();
  if (target) await db().$disconnect();
});
it.skipIf(!target)(
  "generates a private compact guest plan, claims it once without AI, preserves reports and persists task progress",
  async () => {
    if (
      target !==
      "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev"
    )
      throw new Error("Only the isolated local database is allowed");
    for (const [k, v] of Object.entries({
      DATABASE_URL: target,
      APP_URL: "http://localhost:3100",
      NEON_AUTH_BASE_URL: "http://127.0.0.1:3103/auth",
      NEON_AUTH_COOKIE_SECRET:
        "local-integration-cookie-secret-over-32-characters",
      ADVISOR_ENABLED: "true",
      ADVISOR_FIXTURES: "true",
      ADVISOR_LIVE_ENABLED: "false",
      ADVISOR_DAILY_USD: "100",
      OPENAI_MODEL: "gpt-4.1-mini",
      MOCK_ANALYSIS: "true",
      GUEST_ANALYSIS_ENABLED: "true",
      GUEST_IP_MODE: "local",
      GUEST_IP_HASH_SECRET: "a".repeat(48),
      TURNSTILE_SECRET_KEY: "unit-test-secret-key",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "unit-test-site-key",
      GUEST_PRICED_MODEL: "gpt-4.1-mini",
      GUEST_INPUT_USD_PER_MILLION: "0.4",
      GUEST_OUTPUT_USD_PER_MILLION: "1.6",
      GUEST_MAX_COST_USD: "0.20",
      GUEST_MAX_OUTPUT_TOKENS: "8000",
      GUEST_DAILY_CAP: "100",
    }))
      vi.stubEnv(k, v);
    const p = db(),
      suffix = randomUUID();
    const first = await createGuestSession(undefined, suffix);
    const other = await createGuestSession(undefined, randomUUID());
    expect((await readGuestAdvisor(other.token)).status).toBe("EMPTY");
    await expect(readGuestAdvisor(undefined)).rejects.toMatchObject({
      status: 404,
    });
    const context = {
      ...emptyContext,
      resources: {
        hoursPerWeek: 3,
        monthlyBudget: { amount: 0, currency: "USD" },
      },
    };
    const url = `https://senja.io/?guest-test=${suffix}`;
    const health = () =>
      fetch("http://127.0.0.1:3103/health").then((r) => r.json());
    const before = (await health()).aiCalls;
    const generated = await generateGuestAdvisor(
      first.token,
      url,
      context,
      suffix,
    );
    expect((await health()).aiCalls - before).toBe(2);
    expect(generated.status).toBe("SUCCEEDED");
    const original = generated.data!.strategy!.output;
    expect(original.schemaVersion).toBe("advisor/1");
    expect(original.tasks.length).toBeGreaterThanOrEqual(3);
    expect(generated.data!.context.resources.monthlyBudget!.amount).toBe(0);
    expect(JSON.stringify(await readGuestAdvisor(first.token))).not.toContain(
      '"sources"',
    );
    expect((await readGuestAdvisor(other.token)).data!.strategy).toBe(null);
    await expect(
      generateGuestAdvisor(first.token, url, context, suffix),
    ).rejects.toMatchObject({ status: 409 });
    expect((await health()).aiCalls - before).toBe(2);
    const user = await p.user.create({
      data: { id: `guest-advisor-${suffix}`, email: `${suffix}@example.test` },
    });
    const org = await p.organization.create({
      data: {
        ownerId: user.id,
        name: "Local guest advisor test",
        slug: user.id,
        memberships: { create: { userId: user.id } },
      },
    });
    const t = { organizationId: org.id, userId: user.id };
    const product = await p.product.create({
      data: {
        organizationId: org.id,
        name: "Existing Senja report",
        websiteUrl: url,
      },
    });
    const legacy = await p.analysisRun.create({
      data: {
        productId: product.id,
        status: "SUCCEEDED",
        provider: "mock",
        model: "legacy-fixture",
        leaseExpiresAt: new Date(),
        output: mockReport,
      },
    });
    const claimed = await claimGuest(first.token, t);
    expect(claimed).toMatchObject({ advisor: true, productId: product.id });
    expect(await claimGuest(first.token, t)).toEqual(claimed);
    await expect(
      claimGuest(first.token, { ...t, organizationId: "not-owned" }),
    ).rejects.toMatchObject({ status: 403 });
    expect((await health()).aiCalls - before).toBe(2);
    const w = await advisorWorkspace(t, product.id);
    expect(advisorView(w).strategy!.output).toEqual(original);
    expect(
      await p.advisorOperation.count({ where: { workspaceId: w.id } }),
    ).toBe(1);
    expect(
      (await p.analysisRun.findUniqueOrThrow({ where: { id: legacy.id } }))
        .output,
    ).toEqual(mockReport);
    const task = w.strategies[0].tasks[0];
    await completeTask(t, product.id, task.id, true, task.version);
    expect(
      advisorView(await advisorWorkspace(t, product.id)).strategy!.tasks[0]
        .completed,
    ).toBe(true);
    expect((await readGuestAdvisor(first.token)).status).toBe("CLAIMED");
    const blocked = await createGuestSession(undefined, randomUUID());
    vi.stubEnv("ADVISOR_DAILY_USD", "0.1");
    await expect(
      reserveGuestAnalysis(blocked.token, url, randomUUID(), {
        cost: 0.2,
        model: "gpt-6.1-sol",
      }),
    ).rejects.toMatchObject({ status: 429 });
    expect(
      await p.analysisRun.count({
        where: { guestSessionId: blocked.session.id },
      }),
    ).toBe(0);
    expect((await health()).aiCalls - before).toBe(2);
  },
  30000,
);
