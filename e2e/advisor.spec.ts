import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const screenshots = "docs/stage-2b/screenshots";
async function capture(page: Page, name: string) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({ path: `${screenshots}/${name}.png`, fullPage: true });
  if (name === "advisor-desktop" || name === "advisor-mobile") {
    await page.screenshot({ path: `${screenshots}/${name}-viewport.png` });
  }
}
async function signIn(page: Page, email = "alice@example.test") {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("fixture-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45000 });
}
test("signed-in advisor persists context, tasks and assistance without changing strategy", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  const fixtureHealth = await fetch("http://127.0.0.1:3103/health").then((r) =>
    r.json(),
  );
  expect(fixtureHealth.fixture).toBe(true);
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await mkdir(screenshots, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await signIn(page);
  await page.goto("/advisor");
  await page
    .getByLabel("Your SaaS website")
    .fill(`https://senja.io/?advisor-e2e=${Date.now()}`);
  await page.getByRole("button", { name: "Start my advisor" }).click();
  await expect(
    page.getByRole("heading", { name: "Make the plan fit your week." }),
  ).toBeVisible({ timeout: 45000 });
  const advisorUrl = page.url();
  const productId = /products\/([^/]+)\/advisor/.exec(advisorUrl)![1];
  const endpoint = `/api/products/${productId}/advisor`;
  await page
    .getByLabel("Product stage", { exact: true })
    .selectOption("Launched, no paying customers");
  await page.getByLabel("Hours per week").fill("3");
  await page.getByLabel("Monthly acquisition budget").fill("0");
  await page.getByLabel("None", { exact: true }).check();
  await page.getByRole("button", { name: "Save answers for later" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your answers are saved.",
  );
  await page.reload();
  await expect(page.getByLabel("Hours per week")).toHaveValue("3");
  await expect(page.getByLabel("None", { exact: true })).toBeChecked();
  await capture(page, "onboarding-desktop");
  await page.getByRole("button", { name: "Create my seven-day plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next seven days" }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByText("Local fixture data", { exact: false }),
  ).toBeVisible();
  const original = await page.request.get(endpoint).then((r) => r.json());
  const firstTask = page.getByRole("checkbox", {
    name: "Complete: Verify the actual SaaS offer",
    exact: true,
  });
  await firstTask.check();
  await expect(page.getByRole("status")).toContainText("Progress saved.");
  await page.reload();
  await expect(firstTask).toBeChecked();
  await expect(
    page.getByText("1 of 5 complete", { exact: false }),
  ).toBeVisible();
  await capture(page, "advisor-desktop");
  await page
    .getByRole("button", { name: "Explain this recommendation" })
    .click();
  await expect(
    page.getByRole("region", { name: "Advisor response" }),
  ).toContainText("Local AI transport fixture");
  const countAfterHelp = await fetch("http://127.0.0.1:3103/health").then((r) =>
    r.json(),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Explain this recommendation" })
    .click();
  await expect(
    page.getByRole("region", { name: "Advisor response" }),
  ).toBeVisible();
  expect(
    (await fetch("http://127.0.0.1:3103/health").then((r) => r.json())).aiCalls,
  ).toBe(countAfterHelp.aiCalls);
  const taskArticle = page.locator(".advisor-task").first();
  await taskArticle.getByText("Task instructions", { exact: true }).click();
  await taskArticle
    .getByRole("button", { name: "Help me with this task" })
    .click();
  await expect(
    page.getByRole("region", { name: "Advisor response" }),
  ).toContainText("task 1");
  const after = await page.request.get(endpoint).then((r) => r.json());
  expect(after.strategy.output).toEqual(original.strategy.output);
  expect(after.strategy.id).toBe(original.strategy.id);
  const stale = await page.request.post(endpoint, {
    headers: { Origin: "http://localhost:3100" },
    data: {
      kind: "task",
      taskId: original.strategy.tasks[0].id,
      completed: false,
      expectedVersion: 0,
    },
  });
  expect(stale.status()).toBe(409);
  const invalid = await page.request.post(endpoint, {
    headers: { Origin: "https://invalid.example" },
    data: { kind: "generate", expectedVersion: 0 },
  });
  expect(invalid.status()).toBe(403);
  await capture(page, "advisor-help-desktop");
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await capture(page, "advisor-mobile");
  const mobileAccessibility = await new AxeBuilder({ page }).analyze();
  expect(mobileAccessibility.violations).toEqual([]);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in|localhost:3100\/$/);
  await signIn(page);
  await page.goto(advisorUrl);
  await expect(firstTask).toBeChecked();
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await signIn(other, "bob@example.test");
  expect((await other.request.get(endpoint)).status()).toBe(404);
  expect(
    (
      await other.request.post(endpoint, {
        headers: { Origin: "http://localhost:3100" },
        data: {
          kind: "task",
          taskId: original.strategy.tasks[0].id,
          completed: false,
          expectedVersion: 1,
        },
      })
    ).status(),
  ).toBe(404);
  await otherContext.close();
  expect(consoleErrors).toEqual([]);
  await writeFile(
    "docs/stage-2b/browser-verification.json",
    JSON.stringify(
      {
        fixtureOnly: true,
        paidCalls: 0,
        productId,
        persistedAfterReload: true,
        persistedAfterSignIn: true,
        assistanceCached: true,
        assistanceDidNotChangeStrategy: true,
        crossTenantDenied: true,
        staleWriteRejected: true,
        wrongOriginRejected: true,
        desktopAxeViolations: accessibility.violations.length,
        mobileAxeViolations: mobileAccessibility.violations.length,
        browserErrors: consoleErrors,
      },
      null,
      2,
    ),
  );
});

test("Tally supports skipped onboarding and a conditional channel-access fallback", async ({
  page,
}) => {
  test.setTimeout(90000);
  await signIn(page, "bob@example.test");
  await page.goto("/advisor");
  await page
    .getByLabel("Your SaaS website")
    .fill(`https://tally.so/?advisor-e2e=${Date.now()}`);
  await page.getByRole("button", { name: "Start my advisor" }).click();
  await expect(
    page.getByRole("heading", { name: "Make the plan fit your week." }),
  ).toBeVisible({ timeout: 45000 });
  await page.getByRole("button", { name: "Create my seven-day plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next seven days" }),
  ).toBeVisible({ timeout: 45000 });
  await page.getByText("If that route is unavailable", { exact: true }).click();
  await expect(
    page.getByText("If there are no eligible permitted threads", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Verify that helpful, disclosed replies are permitted.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByText("Evidence, adjustments & important unknowns", { exact: true })
    .click();
  await expect(
    page.getByText(
      "Weekly time was skipped; 60 available minutes is a provisional assumption.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Does the actual paid offer solve a problem these owners would purchase beyond unlimited free forms?",
      { exact: true },
    ),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "tally-mobile");
});
