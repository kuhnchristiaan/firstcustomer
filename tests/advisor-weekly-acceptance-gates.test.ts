import { it, expect, vi } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
vi.mock("@/modules/auth/server", () => ({ auth: () => { throw new Error("Isolated synthetic tenant verification"); } }));
import { db } from "@/lib/db";
import { acceptWeeklyPlan } from "@/modules/advisor/weekly-service";
it.skipIf(process.env.WEEKLY_ACCEPTANCE_VERIFY !== "true")("checks the genuine pending proposal approval gates without making any model calls", async () => {
  Object.assign(process.env, { DATABASE_URL: "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_weekly_acceptance", APP_URL: "http://localhost:3100", NEON_AUTH_BASE_URL: "http://127.0.0.1:3103/auth", NEON_AUTH_COOKIE_SECRET: "acceptance-local-cookie-secret-32-characters", ADVISOR_ENABLED: "true", ADVISOR_FIXTURES: "false", ADVISOR_LIVE_ENABLED: "false" });
  const root = "docs/stage-3-live-acceptance/run-1";
  const p = db();
  const c = JSON.parse(await readFile(root+"/3-case.json", "utf8"));
  const product = await p.product.findUniqueOrThrow({ where: { id: c.productId }, include: { organization: true } });
  await expect(acceptWeeklyPlan({ organizationId: product.organizationId, userId: product.organization.ownerId }, c.productId, { reviewId: c.reviewId, expectedPlanId: c.planId, confirmMaterialChange: false })).rejects.toMatchObject({ status: 400 });
  const states = [];
  for (let i=1;i<=3;i++) {
    const item = JSON.parse(await readFile(root+"/"+i+"-case.json", "utf8"));
    const review = await p.advisorWeeklyReview.findUniqueOrThrow({ where: { id: item.reviewId } });
    const count = await p.advisorStrategy.count({ where: { workspaceId: item.workspaceId } });
    expect(count).toBe(1); expect(review.status).toBe("PROPOSED"); expect(review.nextPlanId).toBeNull(); expect(review.acceptedAt).toBeNull();
    states.push({ scenario: i, planCount: count, status: review.status, nextPlanId: review.nextPlanId, acceptedAt: review.acceptedAt });
  }
  await writeFile(root+"/approval-verification.json", JSON.stringify({ paidCalls: 0, materialChangeWithoutConfirmationDenied: true, states },null,2), { flag: "wx" });
  await p.$disconnect();
});
