import { it, expect, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import nextConfig from "../next.config";
import { WorkspaceShell } from "@/components/workspace-shell";
afterEach(() => vi.unstubAllEnvs());
it("hides the sample and long-report pages behind redirects to the advisor", async () => {
  const rules = await nextConfig.redirects!();
  expect(rules).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ source: "/preview", destination: "/advisor" }),
      expect.objectContaining({
        source: "/products/:id",
        destination: "/products/:id/advisor",
      }),
      expect.objectContaining({
        source: "/guest/report",
        destination: "/guest/advisor",
      }),
    ]),
  );
});
it("shows one plans entry and no sample or report navigation", () => {
  vi.stubEnv("ADVISOR_ENABLED", "true");
  const html = renderToStaticMarkup(
    <WorkspaceShell advisor>Example</WorkspaceShell>,
  );
  expect(html).toContain("My plans");
  expect(html).toContain("Acquisition advisor");
  expect(html).not.toContain("Sample strategy");
  expect(html).not.toContain("Historical reports");
  expect(html).not.toContain("Products &amp; strategies");
});
