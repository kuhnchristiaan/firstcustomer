import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Value } from "@/components/report";
import { SegmentComparison } from "@/components/segment-comparison";
import { mockReport } from "@/modules/analysis/mock";
import { mockStrategy } from "@/modules/strategy/mock";
import { mockIntelligence } from "@/modules/strategy/mock-intelligence";
it("keeps every action, duration and decision in the dedicated weekly layout", () => {
  const s = mockStrategy(mockReport, {
    weeklyMinutes: 60,
    payingCustomers: "0",
    monthlyBudget: 0,
    currency: "USD",
  });
  const html = renderToStaticMarkup(
    <Value value={s.weeks} editing={false} onChange={() => {}} />,
  );
  for (const week of s.weeks) {
    expect(html).toContain(week.objective);
    expect(html).toContain(week.deliverable);
    expect(html).toContain(week.successMetric);
    expect(html).toContain(week.nextDecision);
    for (const action of week.actions) expect(html).toContain(action.action);
  }
  expect(html).toContain("minutes total");
});
it("retains the first move message, effort, target and decision criteria", () => {
  const s = mockStrategy(mockReport, { weeklyMinutes: 60 });
  const html = renderToStaticMarkup(
    <Value value={s.firstMove} editing={false} onChange={() => {}} />,
  );
  for (const key of [
    "segment",
    "why",
    "where",
    "action",
    "message",
    "continueWhen",
    "changeWhen",
  ] as const)
    expect(html).toContain(s.firstMove[key]);
  expect(html).toContain(`${s.firstMove.minutes} minutes`);
});
it("compares all nine factors for three segments without dropping assessments", () => {
  const s = mockIntelligence(mockReport, {}, mockStrategy(mockReport, {}));
  if (s.schemaVersion !== "3.0") throw Error("Missing intelligence");
  const html = renderToStaticMarkup(
    <SegmentComparison comparisons={s.intelligence.segmentComparison} />,
  );
  expect(html.match(/scope="row"/g)).toHaveLength(9);
  expect(html.match(/scope="col"/g)).toHaveLength(4);
  expect(html).toContain("not measured demand");
  for (const segment of s.intelligence.segmentComparison)
    expect(html).toContain(segment.name);
});
