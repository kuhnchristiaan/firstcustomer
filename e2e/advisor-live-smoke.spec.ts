import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = "docs/stage-2b-live-smoke";
test.skip(
  process.env.ADVISOR_LIVE_SMOKE_APPROVED !== "0.40",
  "Requires explicit $0.40 live smoke approval and the guarded local launcher.",
);
test("one genuine signed-in Senja plan and explanation, without retries or strategy changes", async ({
  page,
}) => {
  test.setTimeout(300000);
  const ledgerBefore = JSON.parse(
    await readFile(`${root}/ledger.json`, "utf8"),
  );
  expect(ledgerBefore.calls).toBe(0);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("smoke@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("fixture-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45000 });
  await page.goto("/advisor");
  await page.getByLabel("Your SaaS website").fill("https://senja.io/");
  await page.getByRole("button", { name: "Start my advisor" }).click();
  await expect(
    page.getByRole("heading", { name: "Make the plan fit your week." }),
  ).toBeVisible({ timeout: 45000 });
  const url = page.url();
  const productId = /products\/([^/]+)\/advisor/.exec(url)![1];
  const endpoint = `/api/products/${productId}/advisor`;
  const before = await page.request.get(endpoint).then((r) => r.json());
  expect(before.strategy).toBeNull();
  await page
    .getByLabel("Product stage", { exact: true })
    .selectOption("Launched, no paying customers");
  await page.getByLabel("Hours per week").fill("3");
  await page.getByLabel("Monthly acquisition budget").fill("0");
  await page.getByLabel("None", { exact: true }).check();
  const generation = page.waitForResponse(
    (r) => r.url().endsWith(endpoint) && r.request().method() === "POST",
    { timeout: 180000 },
  );
  const generationStarted = Date.now();
  await page.getByRole("button", { name: "Create my seven-day plan" }).click();
  const generatedResponse = await generation;
  const generatedBody = await generatedResponse.json();
  await writeFile(
    `${root}/application-generation.json`,
    JSON.stringify(
      {
        status: generatedResponse.status(),
        latencyMs: Date.now() - generationStarted,
        body: generatedBody,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  expect(generatedResponse.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Your next seven days" }),
  ).toBeVisible();
  const saved = await page.request.get(endpoint).then((r) => r.json());
  expect(saved.strategy.fixture).toBe(false);
  const strategyHash = createHash("sha256")
    .update(JSON.stringify(saved.strategy.output))
    .digest("hex");
  await page.reload();
  const reloaded = await page.request.get(endpoint).then((r) => r.json());
  expect(reloaded.strategy.id).toBe(saved.strategy.id);
  expect(reloaded.strategy.output).toEqual(saved.strategy.output);
  const nextActionBefore = await page
    .getByRole("region", { name: "Next action" })
    .innerText();
  await page
    .getByRole("checkbox", {
      name: `Complete: ${saved.strategy.output.tasks[0].title}`,
      exact: true,
    })
    .check();
  await expect(page.getByRole("status")).toContainText("Progress saved.");
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: `Complete: ${saved.strategy.output.tasks[0].title}`,
      exact: true,
    }),
  ).toBeChecked();
  const nextActionAfter = await page
    .getByRole("region", { name: "Next action" })
    .innerText();
  expect(nextActionAfter).not.toBe(nextActionBefore);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: `${root}/dashboard-desktop.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `${root}/dashboard-desktop-viewport.png` });
  const explanationResponse = page.waitForResponse(
    (r) => r.url().endsWith(endpoint) && r.request().method() === "POST",
    { timeout: 90000 },
  );
  const explanationStarted = Date.now();
  await page
    .getByRole("button", { name: "Explain this recommendation" })
    .click();
  const response = await explanationResponse;
  const explanation = await response.json();
  await writeFile(
    `${root}/application-explanation.json`,
    JSON.stringify(
      {
        status: response.status(),
        latencyMs: Date.now() - explanationStarted,
        body: explanation,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  expect(response.status()).toBe(200);
  expect(explanation.fixture).toBe(false);
  expect(explanation.cached).toBe(false);
  await expect(
    page.getByRole("region", { name: "Advisor response" }),
  ).toContainText("AI-generated explanation");
  const afterHelp = await page.request.get(endpoint).then((r) => r.json());
  expect(afterHelp.strategy.output).toEqual(saved.strategy.output);
  expect(afterHelp.strategy.id).toBe(saved.strategy.id);
  await page.screenshot({
    path: `${root}/explanation-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: `${root}/dashboard-mobile.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `${root}/dashboard-mobile-viewport.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const navigationHeight = await page
    .locator(".workspace-sidebar")
    .evaluate((e) => e.getBoundingClientRect().height);
  const axe = await new AxeBuilder({ page }).analyze();
  const finalLedger = JSON.parse(await readFile(`${root}/ledger.json`, "utf8"));
  expect(finalLedger.calls).toBe(3);
  expect(finalLedger.uncertainReservedUsd).toBe(0);
  expect(finalLedger.settledUpperUsd).toBeLessThanOrEqual(0.4);
  const fixtureHealth = await fetch("http://127.0.0.1:3103/health").then((r) =>
    r.json(),
  );
  expect(fixtureHealth.aiCalls).toBe(0);
  await writeFile(
    `${root}/browser-verification.json`,
    JSON.stringify(
      {
        productId,
        url,
        strategyId: saved.strategy.id,
        strategyHash,
        realAi: true,
        localAuthUpstream: true,
        fixtureAiCalls: fixtureHealth.aiCalls,
        contractAcceptedByApplication: true,
        savedStrategySurvivedRefresh: true,
        completedTaskSurvivedRefresh: true,
        nextActionAdvanced: true,
        explanationWasRealAndUncached: true,
        explanationDidNotChangeStrategy: true,
        navigationHeightPx: navigationHeight,
        mobileAxeViolations: axe.violations,
        browserErrors: errors,
        ledger: finalLedger,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  expect(axe.violations).toEqual([]);
  expect(errors).toEqual([]);
});
