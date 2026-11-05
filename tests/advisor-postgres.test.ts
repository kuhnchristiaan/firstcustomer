import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/modules/auth/server", () => ({
  auth: () => {
    throw new Error(
      "Direct domain integration test; no auth bypass is installed in the app.",
    );
  },
}));
import { db } from "@/lib/db";
import {
  startAdvisor,
  saveContext,
  generateStrategy,
  advisorWorkspace,
  advisorView,
  completeTask,
  assist,
} from "@/modules/advisor/service";
import { emptyContext } from "@/modules/advisor/schema";
import { mockReport } from "@/modules/analysis/mock";
const target = process.env.ADVISOR_TEST_DATABASE_URL;
describe.skipIf(!target)(
  "dedicated local advisor Postgres and AI-transport fixtures",
  () => {
    it("persists execution, rejects stale/cross-account writes, caches help and preserves legacy reports", async () => {
      if (
        target !==
        "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev"
      )
        throw new Error(
          "Only the documented local advisor database is allowed.",
        );
      Object.assign(process.env, {
        DATABASE_URL: target,
        APP_URL: "http://localhost:3100",
        NEON_AUTH_BASE_URL: "http://127.0.0.1:3103/auth",
        NEON_AUTH_COOKIE_SECRET:
          "local-integration-cookie-secret-over-32-characters",
        ADVISOR_ENABLED: "true",
        ADVISOR_FIXTURES: "true",
        ADVISOR_LIVE_ENABLED: "false",
        MONTHLY_ANALYSIS_QUOTA: "100",
        ADVISOR_DAILY_USD: "10",
      });
      const p = db();
      expect(
        p.advisorWorkspace,
        "Generated development client must include the additive advisor models",
      ).toBeDefined();
      const userId = `advisor-integration-${randomUUID()}`;
      await p.user.create({
        data: { id: userId, email: "local@example.test" },
      });
      const organization = await p.organization.create({
        data: {
          ownerId: userId,
          name: "Local advisor integration",
          slug: userId,
          memberships: { create: { userId } },
        },
      });
      const t = { userId, organizationId: organization.id };
      const productId = await startAdvisor(
        t,
        `https://senja.io/?integration=${userId}`,
      );
      expect(
        await startAdvisor(t, `https://senja.io/?integration=${userId}`),
      ).toBe(productId);
      const legacy = await p.analysisRun.create({
        data: {
          productId,
          status: "SUCCEEDED",
          provider: "mock",
          model: "legacy-fixture",
          leaseExpiresAt: new Date(Date.now() + 60000),
          output: mockReport,
        },
      });
      const originalLegacy = JSON.stringify(legacy.output);
      let w = await advisorWorkspace(t, productId);
      expect(w.founderContext).toEqual(emptyContext);
      w = await saveContext(
        t,
        productId,
        {
          ...emptyContext,
          resources: {
            hoursPerWeek: 3,
            monthlyBudget: { amount: 0, currency: "USD" },
          },
        },
        w.version,
      );
      await expect(
        saveContext(t, productId, emptyContext, 0),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        advisorWorkspace({ ...t, organizationId: "other-account" }, productId),
      ).rejects.toMatchObject({ status: 404 });
      w = await generateStrategy(t, productId, w.version);
      const view = advisorView(w);
      expect(view.strategy).not.toBeNull();
      const s = view.strategy!;
      expect(
        s.output.tasks.reduce((n, task) => n + task.minutes, 0),
      ).toBeLessThan(180);
      const completed = await completeTask(
        t,
        productId,
        s.tasks[0].id,
        true,
        0,
      );
      expect(completed.completedAt).not.toBeNull();
      await expect(
        completeTask(t, productId, s.tasks[0].id, false, 0),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        completeTask(
          { ...t, organizationId: "other-account" },
          productId,
          s.tasks[0].id,
          false,
          1,
        ),
      ).rejects.toMatchObject({ status: 404 });
      const help = await assist(t, productId, {
        strategyId: s.id,
        action: "explain",
      });
      expect(help.cached).toBe(false);
      expect(
        (await assist(t, productId, { strategyId: s.id, action: "explain" }))
          .cached,
      ).toBe(true);
      const reloaded = advisorView(await advisorWorkspace(t, productId));
      expect(reloaded.strategy!.output).toEqual(s.output);
      expect(reloaded.strategy!.tasks[0].completed).toBe(true);
      expect(
        JSON.stringify(
          (await p.analysisRun.findUniqueOrThrow({ where: { id: legacy.id } }))
            .output,
        ),
      ).toBe(originalLegacy);
      expect(
        (await generateStrategy(t, productId, w.version)).strategies[0].id,
      ).toBe(s.id);
      await expect(
        saveContext(t, productId, emptyContext, w.version),
      ).rejects.toMatchObject({ status: 409 });
      await p.$disconnect();
    }, 30000);
  },
);
