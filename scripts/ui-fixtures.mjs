// Local visual fixtures only. Never imported by the application or deployed as routes.
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const h = React.createElement;
const server = await createServer({
  configFile: false,
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  },
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const [
    { mockReport },
    { mockStrategy },
    { mockIntelligence },
    { WorkspaceShell, WorkspaceOverview },
    { Brand },
  ] = await Promise.all([
    server.ssrLoadModule("/src/modules/analysis/mock.ts"),
    server.ssrLoadModule("/src/modules/strategy/mock.ts"),
    server.ssrLoadModule("/src/modules/strategy/mock-intelligence.ts"),
    server.ssrLoadModule("/src/components/workspace-shell.tsx"),
    server.ssrLoadModule("/src/components/brand.tsx"),
  ]);
  const context = {
    payingCustomers: "0",
    weeklyTime: "1–2 hours",
    weeklyMinutes: 60,
    monthlyBudget: 0,
    currency: "USD",
    existingAudience: "None",
  };
  const strategy = mockIntelligence(
    mockReport,
    context,
    mockStrategy(mockReport, context),
  );
  const { siteFixture } = await server.ssrLoadModule(
    "/tests/fixtures/product-attribution.ts",
  );
  const attributedFixture = siteFixture();
  const attributed = {
    ...attributedFixture.report,
    schemaVersion: "1.1",
    productIntelligence: attributedFixture.profile,
    recommendationBasis: attributedFixture.basis,
  };
  const { publisherClaimFixture } = await server.ssrLoadModule(
    "/tests/fixtures/publisher-claims.ts",
  );
  const publisherStored = publisherClaimFixture().stored;
  const home = await (await fetch("http://localhost:3100")).text();
  const headAssets = [...home.matchAll(/<link\b[^>]*>/g)]
    .map((x) => x[0])
    .filter((x) => /stylesheet|font/.test(x))
    .join("");
  const htmlClass = /<html[^>]*class="([^"]*)"/.exec(home)?.[1] ?? "";
  const form = h(
    "form",
    {},
    h("label", { htmlFor: "fixture-url" }, "Your SaaS website"),
    h(
      "div",
      { className: "flex flex-col gap-3 sm:flex-row mt-2" },
      h("input", {
        id: "fixture-url",
        placeholder: "https://your-saas.com",
        readOnly: true,
      }),
      h(
        "button",
        {
          type: "button",
          className: "button button-primary px-4 py-2.5 text-sm font-semibold",
        },
        "Generate free report",
      ),
    ),
    h(
      "p",
      { className: "mt-3 text-xs muted" },
      "Visual test fixture. No request will be submitted.",
    ),
  );
  function workspace(products) {
    const content = h(
      WorkspaceShell,
      {},
      h(WorkspaceOverview, {
        products,
        monthly: products.length,
        quota: 20,
        form,
        signOut: h(
          "button",
          { className: "button button-outline px-4 py-2.5 text-sm" },
          "Sign out",
        ),
        nextAction: products.length
          ? {
              text: "Invite two relevant founders to discuss where their last trial stalled. Treat the response as a hypothesis to validate.",
              productId: "fixture",
              name: "Launchboard",
            }
          : undefined,
      }),
    );
    return (
      '<!DOCTYPE html><html lang="en" class="' +
      htmlClass +
      '"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Workspace visual fixture</title>' +
      headAssets +
      '</head><body><header class="site-header"><div class="container header-inner">' +
      renderToStaticMarkup(h(Brand)) +
      '<a href="/preview">Sample strategy</a></div></header><div class="container text-xs muted py-3">Local visual fixture — synthetic product data, no account session.</div>' +
      renderToStaticMarkup(content) +
      "</body></html>"
    );
  }
  await mkdir("artifacts/ui", { recursive: true });
  await writeFile(
    "artifacts/ui/fixtures.json",
    JSON.stringify({
      report: mockReport,
      strategy,
      context,
      attributed,
      publisherStored,
    }),
  );
  await writeFile(
    "artifacts/ui/workspace.html",
    workspace([
      {
        id: "fixture",
        name: "Launchboard",
        websiteUrl: "https://example.invalid",
        status: "ACTIVE",
        latestStatus: "SUCCEEDED",
        approvedVersion: 1,
        updatedLabel: "4 Nov",
      },
    ]),
  );
  await writeFile(
    "artifacts/ui/workspace-states.html",
    workspace([
      {
        id: "retry-fixture",
        name: "Failed SaaS",
        websiteUrl: "https://retry.example.invalid",
        status: "ACTIVE",
        latestStatus: "FAILED",
        approvedVersion: null,
        updatedLabel: "4 Nov",
      },
      {
        id: "active-fixture",
        name: "Building SaaS",
        websiteUrl: "https://building.example.invalid",
        status: "ACTIVE",
        latestStatus: "RUNNING",
        approvedVersion: null,
        updatedLabel: "4 Nov",
      },
      {
        id: "preserved-fixture",
        name: "Saved SaaS",
        websiteUrl: "https://saved.example.invalid",
        status: "ACTIVE",
        latestStatus: "FAILED",
        approvedVersion: 2,
        updatedLabel: "4 Nov",
      },
    ]),
  );
  await writeFile("artifacts/ui/workspace-empty.html", workspace([]));
  console.log(
    "Prepared isolated synthetic report and workspace visual fixtures.",
  );
} finally {
  await server.close();
}
