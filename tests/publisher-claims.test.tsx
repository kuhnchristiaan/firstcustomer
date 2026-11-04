import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { safeInitialReport } from "@/modules/strategy/claims";
import { validateProductProfile } from "@/modules/intelligence/product-profile";
import { ReportView } from "@/components/report";
import { publisherClaimFixture } from "./fixtures/publisher-claims";
import { mockReport } from "@/modules/analysis/mock";
it("retains quoted publisher statements including measurement ranges without claiming independent verification", () => {
  const f = publisherClaimFixture();
  validateProductProfile(f.profile, [f.source]);
  const clean = safeInitialReport(f.report, []);
  expect(clean.overview).toEqual(f.report.overview);
  expect(clean.offerings).toEqual(f.report.offerings);
  expect(clean).toMatchObject({ productIntelligence: f.profile });
  const html = renderToStaticMarkup(<ReportView initial={f.report} />);
  expect(html).toContain("Website claim");
  expect(html).toContain("not independently verified results");
  expect(html).toContain("1 to 100 percent");
});
it("repairs recognizably sanitized product labels from immutable quotations without rewriting the stored report", () => {
  const f = publisherClaimFixture();
  const before = JSON.stringify(f.stored);
  const clean = safeInitialReport(f.stored, []);
  expect(clean.overview).toEqual(f.report.overview);
  expect(clean.offerings).toEqual(f.report.offerings);
  expect(clean.geographicFocus.confidence).toBe("Unknown");
  expect(JSON.stringify(f.stored)).toBe(before);
  expect(safeInitialReport(clean, [])).toEqual(clean);
  const html = renderToStaticMarkup(<ReportView initial={f.stored} />);
  const assessment = html.split('id="overview"')[1].split('id="offerings"')[0];
  expect(assessment).toContain("Website claim");
  expect(assessment).not.toContain("Not established yet");
});
it("does not downgrade an unrelated sibling claim when one unsupported statement is removed", () => {
  const report = structuredClone(mockReport);
  report.offerings = [
    {
      text: "Tracks page views",
      confidence: "Verified",
      sources: ["https://example.invalid/"],
    },
    {
      text: "We increase revenue by 50%.",
      confidence: "Verified",
      sources: [],
    },
  ];
  const clean = safeInitialReport(report, []);
  expect(clean.offerings[0]).toEqual(report.offerings[0]);
  expect(clean.offerings[1].confidence).toBe("Unknown");
  expect(clean.offerings[1].text).not.toContain("50%");
});
it("keeps unsupported outreach promises and arbitrary edits unverified", () => {
  const f = publisherClaimFixture();
  f.report.outreachTemplates[0].body =
    "We increase your revenue by 50%. We are GDPR-compliant.";
  const report = {
    ...f.stored,
    overview: {
      text: "A founder-authored description without matching website evidence",
      confidence: "Unknown" as const,
      sources: [],
    },
  };
  const clean = safeInitialReport(report, []);
  expect(clean.overview).toEqual(report.overview);
  const outreach = safeInitialReport(f.report, []).outreachTemplates[0].body;
  expect(outreach).not.toContain("50%");
  expect(outreach).not.toContain("GDPR-compliant");
});
it("refuses quote-shaped metadata that does not actually support the product statement", () => {
  const f = publisherClaimFixture();
  f.report.productIntelligence.statements[2].evidence[0].quote =
    "A different unsupported capability";
  const clean = safeInitialReport(f.report, []);
  expect(clean.offerings[2].confidence).toBe("Unknown");
  expect(clean.offerings[2].sources).toEqual([]);
});
