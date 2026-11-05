import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/modules/auth/server", () => ({
  auth: () => {
    throw new Error("Domain integration only");
  },
}));
import { db } from "@/lib/db";
import {
  startAdvisor,
  saveContext,
  generateStrategy,
  advisorWorkspace,
  advisorView,
  assist,
} from "@/modules/advisor/service";
import {
  submitResults,
  generateWeeklyReview,
  acceptWeeklyPlan,
  weeklyHistory,
} from "@/modules/advisor/weekly-service";
import { emptyContext } from "@/modules/advisor/schema";
const target = process.env.ADVISOR_TEST_DATABASE_URL;
describe.skipIf(!target)(
  "weekly advisory loop against isolated local Postgres/AI fixtures",
  () => {
    for (const decision of ["Continue", "Adjust", "Reconsider"])
      it(`preserves outcomes/history and applies only an approved ${decision} proposal`, async () => {
        if (
          target !==
          "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev"
        )
          throw new Error("Only dedicated local advisor target allowed");
        Object.assign(process.env, {
          DATABASE_URL: target,
          APP_URL: "http://localhost:3100",
          NEON_AUTH_BASE_URL: "http://127.0.0.1:3103/auth",
          NEON_AUTH_COOKIE_SECRET:
            "local-weekly-fixture-secret-over-32-characters",
          ADVISOR_ENABLED: "true",
          ADVISOR_FIXTURES: "true",
          ADVISOR_LIVE_ENABLED: "false",
          MONTHLY_ANALYSIS_QUOTA: "100",
          ADVISOR_DAILY_USD: "100",
        });
        const p = db();
        const userId = `weekly-${randomUUID()}`;
        await p.user.create({
          data: { id: userId, email: "weekly@example.test" },
        });
        const org = await p.organization.create({
          data: {
            name: "Weekly local fixture",
            slug: userId,
            ownerId: userId,
            memberships: { create: { userId } },
          },
        });
        const t = { userId, organizationId: org.id };
        const productId = await startAdvisor(
          t,
          `https://senja.io/?weekly=${userId}`,
        );
        let w = await advisorWorkspace(t, productId);
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
        w = await generateStrategy(t, productId, w.version);
        const initial = advisorView(w).strategy!;
        const results = {
          planId: initial.id,
          submissionKey: randomUUID(),
          prospectsContacted: 6,
          replies: decision === "Continue" ? null : 2,
          qualifiedConversations: decision === "Adjust" ? 2 : 0,
          activations: 0,
          payingCustomers: null,
          feedback:
            decision === "Reconsider"
              ? "Access unavailable: no permitted route exists."
              : decision === "Adjust"
                ? "Two owners were interested but raised a pricing objection."
                : "Little exposure; preparation is complete, no conclusion about demand.",
          completedTaskIds: [initial.tasks[0].id],
        };
        const recorded = await submitResults(t, productId, results);
        expect(
          (
            await submitResults(t, productId, {
              ...results,
              submissionKey: randomUUID(),
            })
          ).id,
        ).toBe(recorded.id);
        await expect(
          submitResults(t, productId, { ...results, payingCustomers: 1 }),
        ).rejects.toMatchObject({ status: 409 });
        const other = { ...t, organizationId: "other-account" };
        await expect(weeklyHistory(other, productId)).rejects.toMatchObject({
          status: 404,
        });
        const proposal = await generateWeeklyReview(t, productId, recorded.id);
        expect((proposal.proposal as { decision: string }).decision).toBe(
          decision,
        );
        expect((await generateWeeklyReview(t, productId, recorded.id)).id).toBe(
          recorded.id,
        );
        expect(
          advisorView(await advisorWorkspace(t, productId)).strategy!.id,
        ).toBe(initial.id);
        await expect(
          acceptWeeklyPlan(t, productId, {
            reviewId: recorded.id,
            expectedPlanId: "stale-plan",
            confirmMaterialChange: true,
          }),
        ).rejects.toMatchObject({ status: 409 });
        await expect(
          acceptWeeklyPlan(other, productId, {
            reviewId: recorded.id,
            expectedPlanId: initial.id,
            confirmMaterialChange: true,
          }),
        ).rejects.toMatchObject({ status: 404 });
        if (decision === "Reconsider")
          await expect(
            acceptWeeklyPlan(t, productId, {
              reviewId: recorded.id,
              expectedPlanId: initial.id,
              confirmMaterialChange: false,
            }),
          ).rejects.toMatchObject({ status: 400 });
        const accepted = await acceptWeeklyPlan(t, productId, {
          reviewId: recorded.id,
          expectedPlanId: initial.id,
          confirmMaterialChange: decision === "Reconsider",
        });
        expect(
          (
            await acceptWeeklyPlan(t, productId, {
              reviewId: recorded.id,
              expectedPlanId: initial.id,
              confirmMaterialChange: true,
            })
          ).planId,
        ).toBe(accepted.planId);
        const active = advisorView(
          await advisorWorkspace(t, productId),
        ).strategy!;
        expect(active.version).toBe(2);
        expect(active.strategyVersion).toBe(decision === "Reconsider" ? 2 : 1);
        expect(active.tasks.every((task) => !task.completed)).toBe(true);
        const history = await weeklyHistory(t, productId);
        expect(history.plans).toHaveLength(2);
        expect(history.plans[1].output).toEqual(initial.output);
        expect(history.plans[1].tasks[0].completed).toBe(true);
        expect(
          (history.reviews[0].results as { payingCustomers: unknown })
            .payingCustomers,
        ).toBeNull();
        expect(history.reviews[0].status).toBe("ACCEPTED");
        const help = await assist(t, productId, {
          strategyId: active.id,
          action: "explain",
        });
        expect(help.answer).toBeTruthy();
        expect(
          advisorView(await advisorWorkspace(t, productId)).strategy!.output,
        ).toEqual(active.output);
      }, 30000);
  },
);
