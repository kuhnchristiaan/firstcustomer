import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
test("founder returns with actual results, approves an informed next plan and reads history", async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("docs/stage-3/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("alice@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("fixture-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45000 });
  await page.goto("/advisor");
  await page
    .getByLabel("Your SaaS website")
    .fill(`https://senja.io/?weekly-browser=${Date.now()}`);
  await page.getByRole("button", { name: "Start my advisor" }).click();
  await expect(
    page.getByRole("heading", { name: "Make the plan fit your week." }),
  ).toBeVisible({ timeout: 45000 });
  await page.getByLabel("Hours per week").fill("3");
  await page.getByLabel("Monthly acquisition budget").fill("0");
  await page.getByRole("button", { name: "Create my seven-day plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next seven days" }),
  ).toBeVisible({ timeout: 45000 });
  const id = /products\/([^/]+)\/advisor/.exec(page.url())![1];
  const endpoint = `/api/products/${id}/advisor`;
  const initial = await page.request.get(endpoint).then((r) => r.json());
  await page
    .getByRole("checkbox", {
      name: "Complete: Verify the actual SaaS offer",
      exact: true,
    })
    .check();
  await expect(page.getByRole("status")).toContainText("Progress saved.");
  // Refresh ensures the weekly form picks up the completed-task snapshot.
  await page.reload();
  await page.getByLabel("Prospects contacted", { exact: true }).fill("6");
  await page.getByLabel("Replies", { exact: true }).fill("2");
  await page.getByLabel("Qualified conversations", { exact: true }).fill("2");
  await page
    .getByLabel("Trials or product activations", { exact: true })
    .fill("0");
  await page
    .getByLabel("Obstacles, objections and feedback")
    .fill(
      "Two owners were interested but raised a pricing objection. Setup is complete; improve the offer explanation.",
    );
  await page
    .getByRole("heading", { name: "What happened this week?" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/stage-3/screenshots/results-desktop.png",
  });
  await page
    .getByRole("button", { name: "Save weekly results", exact: true })
    .click();
  await expect(page.getByText("Results saved", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Review my results", exact: true })
    .click();
  const proposal = page.getByRole("region", { name: "Proposed next plan" });
  await expect(proposal).toContainText(
    "Keep strategy — adjust execution: your next seven days",
    {
      timeout: 45000,
    },
  );
  await expect(proposal).toContainText("Address the reported objection");
  const stillActive = await page.request.get(endpoint).then((r) => r.json());
  expect(stillActive.strategy.id).toBe(initial.strategy.id);
  expect(stillActive.strategy.output).toEqual(initial.strategy.output);
  await proposal.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/stage-3/screenshots/proposal-desktop.png",
  });
  await page
    .getByRole("button", { name: "Approve and start next plan", exact: true })
    .click();
  await expect(page.getByRole("region", { name: "Next action" })).toContainText(
    "Address the reported objection",
    { timeout: 45000 },
  );
  const next = await page.request.get(endpoint).then((r) => r.json());
  expect(next.strategy.version).toBe(2);
  expect(next.strategy.strategyVersion).toBe(1);
  expect(next.strategy.output.buyer).toEqual(initial.strategy.output.buyer);
  expect(next.strategy.output.channel).toEqual(initial.strategy.output.channel);
  expect(
    next.strategy.tasks.every((t: { completed: boolean }) => !t.completed),
  ).toBe(true);
  const history = page.getByRole("region", { name: "Advisor history" });
  await history.getByText("Plan 1 · Strategy v1", { exact: true }).click();
  await expect(history).toContainText("Paying customers acquired: Unknown");
  await expect(history).toContainText("Accepted");
  await history.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/stage-3/screenshots/history-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "docs/stage-3/screenshots/next-plan-mobile.png",
    fullPage: true,
  });
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await writeFile(
    "docs/stage-3/browser-verification.json",
    JSON.stringify(
      {
        fixtureOnly: true,
        paidCalls: 0,
        productId: id,
        initialPlanId: initial.strategy.id,
        nextPlanId: next.strategy.id,
        proposalDidNotChangeActivePlan: true,
        explicitApprovalApplied: true,
        strategyPreserved: true,
        nextTasksFresh: true,
        historyRetained: true,
        unknownPreserved: true,
        mobileAxeViolations: axe.violations,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
});
