import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportView } from "@/components/report";
import { mockReport } from "@/modules/analysis/mock";
it("renders the complete report for a guest without locked sections", () => {
  const html = renderToStaticMarkup(<ReportView initial={mockReport} />);
  for (const id of [
    "overview",
    "idealCustomers",
    "segments",
    "positioning",
    "acquisitionChannels",
    "outreachTemplates",
    "firstTenPlaybook",
    "thirtyDayPlan",
    "missingInformation",
  ])
    expect(html).toContain(`id="${id}"`);
  expect(html).not.toContain("Edit findings");
  expect(html).not.toContain("Approve &amp; save strategy");
  expect(html).toContain("Print / PDF");
});
it("retains edit and approval controls for an organization-owned report", () => {
  const html = renderToStaticMarkup(
    <ReportView
      initial={mockReport}
      productId="owned-product"
      analysisId="owned-run"
    />,
  );
  expect(html).toContain("Edit findings");
  expect(html).toContain("Approve &amp; save strategy");
});
