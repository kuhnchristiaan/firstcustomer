import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { databaseUrl } from "@/lib/database-url";
import { ReportView } from "@/components/report";
import { mockReport } from "@/modules/analysis/mock";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
it("preserves strong Neon certificate verification without altering local connections", () => {
  expect(
    new URL(
      databaseUrl(
        "postgresql://test:placeholder@db.neon.tech/neondb?sslmode=require",
      ),
    ).searchParams.get("sslmode"),
  ).toBe("verify-full");
  expect(databaseUrl("postgresql://test@127.0.0.1:55439/postgres")).toBe(
    "postgresql://test@127.0.0.1:55439/postgres",
  );
});
it("lists only public pages and excludes private report routes", () => {
  expect(sitemap().map((x) => new URL(x.url).pathname)).toEqual([
    "/",
    "/preview",
  ]);
  expect(JSON.stringify(robots())).toContain("/products/");
});
it("offers mobile report navigation without exposing the internal schema version", () => {
  const html = renderToStaticMarkup(<ReportView initial={mockReport} />);
  expect(html).toContain("Jump to a report section");
  expect(html).not.toContain("SCHEMA");
  expect(html).toContain("Hypothesis — needs validation");
});
