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
    throw new Error("Not used by domain integration tests");
  },
}));
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  createGuestSession,
  readGuest,
  reserveGuestAnalysis,
  generateGuest,
  claimGuest,
} from "@/modules/guest/service";
import { newGuestToken, tokenHash } from "@/modules/guest/security";
import { mockReport } from "@/modules/analysis/mock";
import * as providerModule from "@/modules/analysis/provider";
import { generate, approve } from "@/modules/analysis/service";
import { cleanupGuests } from "@/modules/guest/cleanup";
const connection = process.env.TEST_DATABASE_URL;
describe.skipIf(!connection)(
  "guest PostgreSQL security and concurrency",
  () => {
    beforeAll(() => {
      if (
        !connection?.startsWith(
          "postgresql://firstcustomers_test@127.0.0.1:55439/",
        )
      )
        throw new Error("Only the dedicated local test cluster is allowed");
      for (const [k, v] of Object.entries({
        DATABASE_URL: connection,
        APP_URL: "http://localhost:3000",
        NEON_AUTH_BASE_URL: "https://auth.example.com/auth",
        NEON_AUTH_COOKIE_SECRET: "test-only-cookie-secret-more-than-32-chars",
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
        GUEST_MAX_COST_USD: "0.03",
      }))
        vi.stubEnv(k, v);
    });
    beforeEach(async () => {
      vi.stubEnv("GUEST_DAILY_CAP", "20");
      vi.stubEnv("GUEST_MAX_CONCURRENT", "2");
      vi.stubEnv("GUEST_IP_HOURLY_ATTEMPTS", "2");
      await db().analysisRun.updateMany({
        where: { guestSessionId: { not: null }, status: "RUNNING" },
        data: { status: "FAILED" },
      });
      await db().usageBucket.deleteMany({
        where: { key: { startsWith: "guest:" } },
      });
    });
    afterAll(async () => {
      vi.unstubAllEnvs();
      if (connection) await db().$disconnect();
    });
    const session = () => createGuestSession(undefined, randomUUID());
    async function owner() {
      const id = randomUUID();
      await db().user.create({ data: { id, email: `${id}@example.com` } });
      const org = await db().organization.create({
        data: {
          name: "Guest claim test",
          slug: `guest-test-${id}`,
          ownerId: id,
          memberships: { create: { userId: id } },
        },
      });
      return { userId: id, organizationId: org.id };
    }
    it("cleans up expired guest data without deleting claimed reports", async () => {
      const expired = await session(),
        saved = await session();
      await generateGuest(
        expired.token,
        "https://expired.example.com",
        randomUUID(),
      );
      await generateGuest(
        saved.token,
        "https://saved.example.com",
        randomUUID(),
      );
      const expiredRun = await db().analysisRun.findFirstOrThrow({
        where: { guestSessionId: expired.session.id },
      });
      await db().websiteSource.create({
        data: {
          analysisId: expiredRun.id,
          url: "https://expired.example.com/",
          title: "Expired source",
          content: "Old public content",
          contentHash: "hash",
          status: "SUCCESS",
        },
      });
      const claimed = await claimGuest(saved.token, await owner());
      await db().guestAnalysisSession.updateMany({
        where: { id: { in: [expired.session.id, saved.session.id] } },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(await cleanupGuests()).toBeGreaterThanOrEqual(1);
      expect(
        await db().guestAnalysisSession.findUnique({
          where: { id: expired.session.id },
        }),
      ).toBeNull();
      expect(
        await db().websiteSource.count({
          where: { analysisId: expiredRun.id },
        }),
      ).toBe(0);
      expect(
        await db().analysisRun.findUnique({
          where: { id: claimed.analysisId },
        }),
      ).not.toBeNull();
      expect(
        await db().guestAnalysisSession.findUnique({
          where: { id: saved.session.id },
        }),
      ).not.toBeNull();
    });
    it("generates the complete report without a user or organization", async () => {
      const s = await session();
      await generateGuest(s.token, "https://example.com", randomUUID());
      const report = await readGuest(s.token);
      expect(report.status).toBe("SUCCEEDED");
      expect(report.output).toEqual(mockReport);
      const run = await db().analysisRun.findFirstOrThrow({
        where: { guestSessionId: s.session.id },
      });
      expect(run.productId).toBeNull();
      expect(run.estimatedCost?.toString()).toBe("0");
      expect(
        (
          await db().guestAnalysisSession.findUniqueOrThrow({
            where: { id: s.session.id },
          })
        ).tokenHash,
      ).toBe(tokenHash(s.token));
    });
    it("rejects absent and incorrect access tokens", async () => {
      await expect(readGuest(undefined)).rejects.toMatchObject({ status: 404 });
      await expect(readGuest(newGuestToken())).rejects.toMatchObject({
        status: 404,
      });
    });
    it("enforces expiry immediately for reads and claims", async () => {
      const s = await session();
      await generateGuest(s.token, "https://example.com", randomUUID());
      await db().guestAnalysisSession.update({
        where: { id: s.session.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await expect(readGuest(s.token)).rejects.toMatchObject({ status: 404 });
      await expect(claimGuest(s.token, await owner())).rejects.toMatchObject({
        status: 404,
      });
    });
    it("permits only one successful free report per session", async () => {
      const s = await session();
      await generateGuest(s.token, "https://example.com", randomUUID());
      await expect(
        generateGuest(s.token, "https://different.example.com", randomUUID()),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        await db().analysisRun.count({
          where: { guestSessionId: s.session.id },
        }),
      ).toBe(1);
    });
    it("blocks duplicate concurrent starts before another AI request can run", async () => {
      const s = await session();
      const attempts = await Promise.allSettled(
        [1, 2, 3].map(() =>
          reserveGuestAnalysis(s.token, "https://example.com", randomUUID()),
        ),
      );
      expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
      expect(
        await db().analysisRun.count({
          where: { guestSessionId: s.session.id },
        }),
      ).toBe(1);
    });
    it("serializes global daily quota reservations across guests", async () => {
      const sessions = await Promise.all([session(), session(), session()]);
      vi.stubEnv("GUEST_DAILY_CAP", "1");
      vi.stubEnv("GUEST_MAX_CONCURRENT", "5");
      const results = await Promise.allSettled(
        sessions.map((s) =>
          reserveGuestAnalysis(s.token, "https://example.com", randomUUID()),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        (
          await db().usageBucket.findUniqueOrThrow({
            where: {
              key: `guest:daily:${new Date().toISOString().slice(0, 10)}`,
            },
          })
        ).count,
      ).toBe(1);
    });
    it("enforces shared network and global concurrency limits", async () => {
      const a = await session(),
        b = await session();
      vi.stubEnv("GUEST_IP_HOURLY_ATTEMPTS", "1");
      await reserveGuestAnalysis(
        a.token,
        "https://example.com",
        "same-private-hash",
      );
      await expect(
        reserveGuestAnalysis(
          b.token,
          "https://example.com",
          "same-private-hash",
        ),
      ).rejects.toMatchObject({ status: 429 });
      vi.stubEnv("GUEST_MAX_CONCURRENT", "1");
      await expect(
        reserveGuestAnalysis(
          b.token,
          "https://example.com",
          "different-private-hash",
        ),
      ).rejects.toMatchObject({ status: 429 });
    });
    it("records failed AI usage, permits one bounded retry and never invents output", async () => {
      const s = await session();
      const stub = vi.spyOn(providerModule, "provider").mockReturnValue({
        analyze: async () => {
          throw new providerModule.ProviderOutputError(
            100,
            30,
            "Malformed test output",
          );
        },
      });
      try {
        await expect(
          generateGuest(s.token, "https://example.com", randomUUID()),
        ).rejects.toMatchObject({ status: 502 });
      } finally {
        stub.mockRestore();
      }
      const failed = await db().analysisRun.findFirstOrThrow({
        where: { guestSessionId: s.session.id },
      });
      expect(failed.status).toBe("FAILED");
      expect(failed.inputTokens).toBe(100);
      expect(failed.output).toBeNull();
      const retryState=await readGuest(s.token);
      expect(retryState.status).toBe("FAILED");
      expect(new URL(retryState.websiteUrl).hostname).toBe("example.com");
      await generateGuest(s.token, "https://example.com", randomUUID());
      expect((await readGuest(s.token)).status).toBe("SUCCEEDED");
      expect(
        await db().analysisRun.count({
          where: { guestSessionId: s.session.id },
        }),
      ).toBe(2);
    });
    it("claims atomically, is idempotent and transfers the exact existing report", async () => {
      const s = await session();
      await generateGuest(s.token, "https://example.com", randomUUID());
      const t = await owner();
      const claimed = await Promise.all([
        claimGuest(s.token, t),
        claimGuest(s.token, t),
      ]);
      expect(claimed[0]).toEqual(claimed[1]);
      const run = await db().analysisRun.findUniqueOrThrow({
        where: { id: claimed[0].analysisId },
      });
      expect(run.output).toEqual(mockReport);
      expect(run.productId).toBe(claimed[0].productId);
      expect(
        await db().analysisRun.count({
          where: { guestSessionId: s.session.id },
        }),
      ).toBe(1);
      expect(
        await db().auditEvent.count({
          where: { resourceId: run.id, action: "GUEST_REPORT_CLAIMED" },
        }),
      ).toBe(1);
      await expect(readGuest(s.token)).rejects.toMatchObject({ status: 404 });
    });
    it("allows only one tenant to win a concurrent claim", async () => {
      const s = await session();
      await generateGuest(s.token, "https://example.com", randomUUID());
      const a = await owner(),
        b = await owner();
      const results = await Promise.allSettled([
        claimGuest(s.token, a),
        claimGuest(s.token, b),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const stored = await db().guestAnalysisSession.findUniqueOrThrow({
        where: { id: s.session.id },
      });
      const loser = stored.claimedOrganizationId === a.organizationId ? b : a;
      await expect(claimGuest(s.token, loser)).rejects.toMatchObject({
        status: 404,
      });
    });
    it("requires active membership and the original token, never URL or email matching", async () => {
      const s = await session();
      await generateGuest(s.token, "https://example.com", randomUUID());
      const t = await owner();
      await expect(claimGuest(undefined, t)).rejects.toMatchObject({
        status: 404,
      });
      await expect(claimGuest(newGuestToken(), t)).rejects.toMatchObject({
        status: 404,
      });
      await db().membership.updateMany({
        where: { userId: t.userId },
        data: { status: "INACTIVE" },
      });
      await expect(claimGuest(s.token, t)).rejects.toMatchObject({
        status: 403,
      });
    });
    it("preserves an existing approved product profile when another guest report is claimed", async () => {
      const t = await owner();
      const productId = await generate(t, "https://example.com");
      await approve(
        t,
        productId,
        (await db().analysisRun.findFirstOrThrow({ where: { productId } })).id,
        mockReport,
        0,
      );
      const s = await session();
      await generateGuest(s.token, "https://example.com", randomUUID());
      const claimed = await claimGuest(s.token, t);
      expect(claimed.productId).toBe(productId);
      expect(await db().productProfile.count({ where: { productId } })).toBe(1);
      expect(await db().analysisRun.count({ where: { productId } })).toBe(2);
    });
  },
);
