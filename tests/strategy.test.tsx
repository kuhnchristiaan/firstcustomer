import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  founderSchema,
  validateStrategy,
  weeklyAllowance,
  type FounderContext,
} from "@/modules/strategy/schema";
import { mockStrategy } from "@/modules/strategy/mock";
import { mockReport } from "@/modules/analysis/mock";
import { Value } from "@/components/report";
const personas: FounderContext[] = [
  {
    payingCustomers: "0",
    weeklyTime: "Less than 1 hour",
    monthlyBudget: 0,
    currency: "USD",
  },
  {
    payingCustomers: "1–10",
    weeklyTime: "3–5 hours",
    weeklyMinutes: 300,
    monthlyBudget: 500,
    currency: "EUR",
  },
  {
    payingCustomers: "More than 200",
    weeklyTime: "More than 10 hours",
    weeklyMinutes: 1800,
    monthlyBudget: 10000,
    currency: "GBP",
  },
];
it("accepts optional context, zero values and different currencies", () => {
  expect(founderSchema.parse({})).toEqual({});
  expect(
    founderSchema.parse({ freeUsers: 0, monthlyBudget: 0, currency: "JPY" })
      .monthlyBudget,
  ).toBe(0);
  expect(founderSchema.safeParse({ monthlyBudget: 20 }).success).toBe(false);
  expect(founderSchema.safeParse({ currency: "XXX" }).success).toBe(false);
  expect(founderSchema.safeParse({ weeklyMinutes: -1 }).success).toBe(false);
  expect(
    founderSchema.safeParse({
      weeklyTime: "Less than 1 hour",
      weeklyMinutes: 300,
    }).success,
  ).toBe(false);
  expect(
    founderSchema.safeParse({ channels: ["None", "Cold email"] }).success,
  ).toBe(false);
  expect(founderSchema.safeParse({ madeUpFact: true }).success).toBe(false);
});
it("meaningfully changes recommendations for all three founder personas without modifying product facts", () => {
  const before = JSON.stringify(mockReport),
    outputs = personas.map((c) => mockStrategy(mockReport, c));
  expect(new Set(outputs.map((s) => s.channels[0].name)).size).toBe(3);
  expect(outputs[0].firstTen.batchPlanningTarget).toBeLessThan(
    outputs[1].firstTen.batchPlanningTarget,
  );
  outputs.forEach((s, i) => {
    expect(s.firstMove.minutes).toBeLessThanOrEqual(
      weeklyAllowance(personas[i]),
    );
    for (const w of s.weeks)
      expect(w.actions.reduce((n, a) => n + a.minutes, 0)).toBeLessThanOrEqual(
        weeklyAllowance(personas[i]),
      );
    expect(s.firstTen.paymentDefinition).toContain(
      "free signup or trial is not a paying customer",
    );
    expect(
      s.channels.every(
        (c) => c.evidenceLevel === "Inferred — unvalidated experiment",
      ),
    ).toBe(true);
  });
  expect(JSON.stringify(mockReport)).toBe(before);
});
it("rejects overcommitted weekly work, costs, currency and fake validation", () => {
  const c = personas[0],
    s = mockStrategy(mockReport, c);
  const over = structuredClone(s);
  over.weeks[0].actions[0].minutes = 200;
  expect(() => validateStrategy(over, c)).toThrow("time");
  const spend = structuredClone(s);
  spend.channels[0].monthlyDirectCost = 1;
  expect(() => validateStrategy(spend, c)).toThrow("budget");
  const currency = structuredClone(s);
  currency.channels[0].costCurrency = "ZAR";
  expect(() => validateStrategy(currency, c)).toThrow("currency");
  expect(() =>
    validateStrategy(
      {
        ...s,
        channels: s.channels.map((x) => ({ ...x, evidenceLevel: "Verified" })),
      },
      c,
    ),
  ).toThrow();
});
it("prints escaped outreach newlines as actual lines and deduplicates repeated claim sources", () => {
  const html = renderToStaticMarkup(
    <Value value={"Hello\\nFounder"} editing={false} onChange={() => {}} />,
  );
  expect(html).toContain("Hello\nFounder");
  expect(html).not.toContain("\\n");
  const claim = renderToStaticMarkup(
    <Value
      value={{
        text: "A fact",
        confidence: "Verified",
        sources: ["https://example.com", "https://example.com"],
      }}
      editing={false}
      onChange={() => {}}
    />,
  );
  expect(claim.match(/href=/g)).toHaveLength(1);
});
