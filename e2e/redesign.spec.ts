import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, mkdir } from "node:fs/promises";
const fixture = JSON.parse(
  await readFile("artifacts/ui/fixtures.json", "utf8"),
);
const widths = [320, 375, 390, 768, 1024, 1440];
const sdk = `window.turnstile={render:function(el,o){el.innerHTML='<div style="border:1px solid #dfe2e4;background:#f8f7f3;padding:16px;max-width:100%;font:12px sans-serif;min-height:'+(o.size==='compact'?120:64)+'px">Verification · local UI fixture</div>';setTimeout(function(){o.callback('local-ui-fixture-token')},50);return 'fixture-widget';},remove:function(){}};`;
async function setup(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: sdk }),
  );
  await page.route("**/api/funnel", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/guest/session", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/guest/report", (route) =>
    route.fulfill({
      json: {
        status: "SUCCEEDED",
        output: fixture.report,
        mock: true,
        expiresAt: "2026-11-06T12:00:00Z",
        websiteUrl: "https://example.invalid",
      },
    }),
  );
  await page.route("**/api/guest/refinement", (route) =>
    route.fulfill({
      json: {
        defaultContext: fixture.context,
        revisions: [
          {
            id: "fixture-v1",
            version: 1,
            status: "SUCCEEDED",
            context: fixture.context,
            output: fixture.strategy,
            mock: true,
            approved: false,
            createdAt: "2026-11-04T12:00:00Z",
            error: null,
          },
        ],
      },
    }),
  );
  await page.route("**/ui-workspace-fixture", async (route) =>
    route.fulfill({
      contentType: "text/html",
      body: await readFile("artifacts/ui/workspace.html", "utf8"),
    }),
  );
  await page.route("**/ui-empty-fixture", async (route) =>
    route.fulfill({
      contentType: "text/html",
      body: await readFile("artifacts/ui/workspace-empty.html", "utf8"),
    }),
  );
}
const pages = [
  { name: "homepage", path: "/" },
  { name: "sample", path: "/preview" },
  { name: "sign-in", path: "/auth/sign-in" },
  { name: "sign-up", path: "/auth/sign-up" },
  { name: "refined", path: "/guest/report" },
  { name: "workspace", path: "/ui-workspace-fixture" },
];
for (const width of widths)
  for (const entry of pages)
    test(`${entry.name} at ${width}px`, async ({ page }) => {
      await setup(page);
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(entry.path);
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({
        content: "nextjs-portal{display:none!important}",
      });
      if (entry.name === "homepage")
        await expect(
          page.getByRole("button", { name: "Generate my free strategy" }),
        ).toBeEnabled();
      if (entry.name === "refined")
        await expect(
          page.getByText("Why this strategy was selected"),
        ).toBeVisible();
      const overflow = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("main *")]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 2)
          .slice(0, 8)
          .map((e) => e.tagName + "." + e.className),
      }));
      expect(overflow, JSON.stringify(overflow)).toMatchObject({
        viewport: width,
        document: width,
      });
      expect(errors).toEqual([]);
      if (width === 390 || width === 1440) {
        await mkdir("artifacts/ui", { recursive: true });
        await page.screenshot({
          path: `artifacts/ui/${entry.name}-${width}.png`,
          fullPage: true,
        });
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          scan.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
      }
    });
test("URL recovery, mobile navigation and copy controls", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Generate my free strategy" }),
  ).toBeEnabled();
  await page.getByLabel("Your SaaS website").fill("not a website");
  await page.getByRole("button", { name: "Generate my free strategy" }).click();
  await expect(page.locator(".url-form [role=alert]")).toContainText(
    "public website",
  );
  await expect(page.getByLabel("Your SaaS website")).toHaveValue(
    "not a website",
  );
  await page.goto("/preview");
  await page.getByText("Jump to a report section").click();
  await expect(
    page.getByRole("link", {
      name: "Sales messaging and outreach templates",
      exact: true,
    }),
  ).toBeVisible();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy message" }).first().click();
  await expect(
    page.getByRole("status").filter({ hasText: "Copied" }),
  ).toBeVisible();
});
test("founder context and revision selection stay interactive", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/guest/report");
  await page.getByRole("button", { name: "Edit Founder Context" }).click();
  await expect(
    page.getByLabel("How many paying customers do you have?"),
  ).toHaveValue("0");
  await page
    .getByLabel("How many paying customers do you have?")
    .selectOption("11–50");
  await page.getByLabel("Strategy history").selectOption("initial");
  await expect(
    page.getByRole("heading", {
      name: fixture.report.businessName,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Strategy history").selectOption("fixture-v1");
  await expect(page.getByText("Why this strategy was selected")).toBeVisible();
});
test("keyboard navigation, password visibility and empty state", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/auth/sign-in");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.goto("/ui-empty-fixture");
  await expect(
    page.getByRole("heading", { name: "Your first move belongs here." }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/ui/workspace-empty.png",
    fullPage: true,
  });
});
test("print expands substantive details and exports A4 and Letter", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/guest/report");
  await expect(page.getByText("Why this strategy was selected")).toBeVisible();
  const comparison = page.locator(".comparison-matrix");
  await expect(comparison).not.toHaveAttribute("open");
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(comparison).toHaveAttribute("open");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(comparison).not.toHaveAttribute("open");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print / PDF" })).toBeHidden();
  const details = page.locator("details").filter({
    has: page.getByText("Practical experiments and effort assumptions", {
      exact: true,
    }),
  });
  await expect(details.locator(".experiment-entry").first()).toBeVisible();
  await expect(page.locator(".comparison-matrix table")).toBeVisible();
  await page.pdf({
    path: "artifacts/ui/refined-A4.pdf",
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.addStyleTag({ content: "@page { size: Letter; }" });
  await page.pdf({
    path: "artifacts/ui/refined-Letter.pdf",
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.screenshot({
    path: "artifacts/ui/print-preview.png",
    fullPage: true,
  });
});
test("recoverable report errors preserve the URL and allow a guest retry", async ({
  page,
}) => {
  await setup(page);
  let attempts = 0;
  await page.route("**/api/guest/analyses", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({
          status: 503,
          json: { error: "Reports are busy. Please try again." },
        })
      : route.fulfill({ json: { ok: true } });
  });
  await page.goto("/");
  await page.getByLabel("Your SaaS website").fill("example.com");
  await expect(
    page.getByRole("button", { name: "Generate my free strategy" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Generate my free strategy" }).click();
  await expect(page.locator(".url-form [role=alert]")).toContainText(
    "Reports are busy",
  );
  await expect(page.getByLabel("Your SaaS website")).toHaveValue("example.com");
  await expect(
    page.getByRole("button", { name: "Generate my free strategy" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Generate my free strategy" }).click();
  await expect(page).toHaveURL(/\/guest\/report/);
  await expect(page.getByText("Why this strategy was selected")).toBeVisible();
  expect(attempts).toBe(2);
});
test("supporting pages remain accessible on narrow screens and reduced motion", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "/auth/forgot-password",
    "/auth/reset-password",
    "/privacy",
    "/terms",
    "/support",
    "/not-a-real-page",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(scan.violations.map((v) => v.id)).toEqual([]);
  }
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

// SDK callbacks are deterministic local fixtures only. Production verification is never mocked.
test("Turnstile expiry, errors and offline recovery retain the submitted URL", async ({
  page,
}) => {
  await setup(page);
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render:(el,o)=>{window.testVerification=o;return 'recovery-fixture'},remove:()=>{}};`,
    }),
  );
  await page.goto("/");
  const submit = page.getByRole("button", {
    name: "Generate my free strategy",
  });
  await page.getByLabel("Your SaaS website").fill("https://example.com");
  await expect(submit).toBeDisabled();
  await page.waitForFunction(
    () =>
      !!(
        window as unknown as {
          testVerification: Record<string, (...args: string[]) => void>;
        }
      ).testVerification,
  );
  for (const event of [
    "expired-callback",
    "timeout-callback",
    "error-callback",
  ]) {
    await page.evaluate(() =>
      (
        window as unknown as {
          testVerification: Record<string, (...args: string[]) => void>;
        }
      ).testVerification.callback("local-fixture-token"),
    );
    await expect(submit).toBeEnabled();
    await page.evaluate(
      (e) =>
        (
          window as unknown as {
            testVerification: Record<string, (...args: string[]) => void>;
          }
        ).testVerification[e](),
      event,
    );
    await expect(submit).toBeDisabled();
    await page.getByRole("button", { name: "Retry verification" }).click();
    await expect(page.getByLabel("Your SaaS website")).toHaveValue(
      "https://example.com",
    );
  }
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("offline");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("status")).toContainText("Connection restored");
  await page.getByRole("button", { name: "Retry verification" }).click();
  await page.evaluate(() =>
    (
      window as unknown as {
        testVerification: Record<string, (...args: string[]) => void>;
      }
    ).testVerification.callback("fresh-local-fixture-token"),
  );
  await expect(submit).toBeEnabled();
});
test("Turnstile can retry a failed SDK download", async ({ page }) => {
  await setup(page);
  let downloads = 0;
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    ++downloads === 1
      ? route.abort()
      : route.fulfill({ contentType: "application/javascript", body: sdk }),
  );
  await page.goto("/");
  await page.getByLabel("Your SaaS website").fill("https://example.com");
  await expect(
    page.getByRole("button", { name: "Generate my free strategy" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Retry verification" }).click();
  await expect(
    page.getByRole("button", { name: "Generate my free strategy" }),
  ).toBeEnabled();
  await expect(page.getByLabel("Your SaaS website")).toHaveValue(
    "https://example.com",
  );
});
test("initial, short and long reports print without screen width constraints", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guest/report");
  await page.getByLabel("Strategy history").selectOption("initial");
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "artifacts/ui/initial-A4.pdf",
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.goto("/guest/report");
  await expect(page.getByText("Why this strategy was selected")).toBeVisible();
  await page.pdf({
    path: "artifacts/ui/refined-mobile-viewport-A4.pdf",
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
  });
  // Stress the existing report with longer substantive text, retaining every section.
  await page.evaluate(() => {
    document
      .querySelectorAll(".experiment-entry p,.comparison-entry p,.week-entry p")
      .forEach((el) => (el.textContent = (el.textContent + " ").repeat(4)));
  });
  await page.pdf({
    path: "artifacts/ui/long-A4.pdf",
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.goto("/guest/report");
  await expect(page.getByText("Why this strategy was selected")).toBeVisible();
  await page.evaluate(() => {
    document.querySelectorAll(".refined-report > section").forEach((el, i) => {
      if (i > 1) el.remove();
    });
    document
      .querySelectorAll(".refined-report > details")
      .forEach((el) => el.remove());
  });
  await page.pdf({
    path: "artifacts/ui/short-A4.pdf",
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
  });
});

test("attributed report displays exact publisher evidence and a single source list", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/guest/report", (route) =>
    route.fulfill({
      json: {
        status: "SUCCEEDED",
        output: fixture.attributed,
        mock: false,
        expiresAt: "2026-11-06T12:00:00Z",
        websiteUrl: "https://www.firstcustomers.app/",
      },
    }),
  );
  await page.route("**/api/guest/refinement", (route) =>
    route.fulfill({ json: { defaultContext: fixture.context, revisions: [] } }),
  );
  await page.goto("/guest/report");
  await page
    .getByText("Product identity and quoted evidence", { exact: true })
    .click();
  await expect(
    page.locator(".product-attribution blockquote").first(),
  ).toContainText(
    fixture.attributed.productIntelligence.statements[0].evidence[0].quote,
  );
  await expect(page.locator(".source-references li")).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "artifacts/ui/attributed-A4.pdf",
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
  });
});

test("Turnstile stalled verification offers recovery without enabling generation", async ({
  page,
}) => {
  await setup(page);
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render:()=> 'waiting-fixture',remove:()=>{}};`,
    }),
  );
  await page.clock.install();
  await page.goto("/");
  await page.getByLabel("Your SaaS website").fill("https://example.com");
  await page.clock.fastForward(46000);
  await expect(
    page.getByRole("button", { name: "Retry verification" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate my free strategy" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Your SaaS website")).toHaveValue(
    "https://example.com",
  );
});

for (const width of widths)
  test(`founder questionnaire wraps at ${width}px`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/guest/report");
    await page.getByRole("button", { name: "Edit Founder Context" }).click();
    await expect(
      page.getByLabel("How many paying customers do you have?"),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    if (width === 390 || width === 1440) {
      await page
        .locator("#refine-strategy")
        .screenshot({ path: `artifacts/ui/founder-context-${width}.png` });
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(scan.violations.map((v) => v.id)).toEqual([]);
    }
  });
