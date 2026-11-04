import { it, expect } from "vitest";
import { mockReport } from "@/modules/analysis/mock";
import { mockStrategy } from "@/modules/strategy/mock";
import { mockIntelligence } from "@/modules/strategy/mock-intelligence";
import { allocateEffort } from "@/modules/strategy/planning";
import {
  verifyClaims,
  safeInitialReport,
  type ClaimReview,
} from "@/modules/strategy/claims";
import {
  validateStrategy,
  strategySchema,
  weeklyAllowance,
  type FounderContext,
} from "@/modules/strategy/schema";
const a: FounderContext = {
  payingCustomers: "0",
  weeklyTime: "1–2 hours",
  weeklyMinutes: 60,
  monthlyBudget: 0,
  currency: "USD",
  existingAudience: "None",
};
const b: FounderContext = {
  payingCustomers: "11–50",
  weeklyMinutes: 300,
  monthlyBudget: 500,
  currency: "EUR",
  channels: ["Partnerships or referrals", "SEO or content marketing"],
};
const make = (c: FounderContext, r = mockReport) =>
  mockIntelligence(r, c, mockStrategy(r, c));
it("calculates phase budgets within existing tasks and rejects insufficient research time", () => {
  const strategy = mockStrategy(mockReport, a);
  for (const effort of allocateEffort(strategy)) {
    const planned = strategy.weeks
      .find((w) => w.week === effort.week)!
      .actions.reduce((n, action) => n + action.minutes, 0);
    expect(
      effort.researchMinutes +
        effort.preparationMinutes +
        effort.outreachMinutes +
        effort.replyMinutes +
        effort.followUpMinutes,
    ).toBe(planned);
    expect(effort.replyMinutes).toBeGreaterThan(0);
    expect(effort.followUpMinutes).toBeGreaterThan(0);
  }
  strategy.firstTen.batchPlanningTarget = 40;
  expect(() => allocateEffort(strategy)).toThrow("research");
});
it("A uses a small validation experiment, B builds on existing referrals and organic traffic", () => {
  const early = make(a),
    growing = make(b);
  expect(early.channels[0].name).toBe("One focused problem interview");
  expect(growing.channels[0].name).toBe("Customer referral experiment");
  expect(early.firstMove.where).toContain("no existing audience");
  for (const [s, c] of [
    [early, a],
    [growing, b],
  ] as const) {
    expect(s.schemaVersion).toBe("3.0");
    for (const w of s.weeks)
      expect(w.actions.reduce((n, x) => n + x.minutes, 0)).toBeLessThanOrEqual(
        weeklyAllowance(c),
      );
  }
});
it("C considers smaller accessible buyers rather than automatically favouring enterprise budgets", () => {
  const product = structuredClone(mockReport);
  product.overview.text =
    "Enterprise SaaS with procurement and complex integrations";
  product.segments[0].name = "Enterprise procurement teams";
  const s = make({ ...a, weeklyMinutes: 60 }, product);
  expect(s.prioritizedSegments[0].name).toBe(product.segments[1].name);
  if (s.schemaVersion !== "3.0") throw Error("Missing assessment");
  expect(s.intelligence.commercialWeaknesses.join()).toContain("procurement");
  expect(s.intelligence.firstMoveTradeoff).toContain("smaller");
  expect(Object.keys(s.intelligence.segmentComparison[0].factors)).toHaveLength(
    9,
  );
});
it.each([
  "Many providers find that digitizing renewals halves their admin load.",
  "Our product reduces admin time by 50%.",
  "We are POPIA-compliant.",
  "A customer said this transformed their business.",
  "Customers saved $500 per month.",
  "We have 500 paying customers.",
  "Our product is ISO 27001 certified.",
  "Our product guarantees security.",
  "We are the market leader.",
  "Our product integrates with Salesforce.",
  "Our product is faster than every competitor.",
  "Our product has bank-grade security.",
])("D removes an unsupported factual assertion: %s", (claim) => {
  const output = verifyClaims(
    {
      executiveSummary: claim,
      positioning: claim,
      messages: [{ body: claim }],
    },
    [],
    [],
    {},
  );
  expect(output.value.executiveSummary).not.toContain(claim);
  expect(output.value.messages[0].body).not.toContain(claim);
  expect(output.actions.some((x) => x.action === "removed")).toBe(true);
});
it("checks exact source snippets and founder feature confirmation; neither establishes legal or performance verification", () => {
  expect(
    verifyClaims({ sources: ["https://example.com/gdpr"] }, [], [], {}).value
      .sources,
  ).toEqual(["https://example.com/gdpr"]);
  const claim = "The product supports digital issuing.";
  const review: ClaimReview = {
    path: "positioning",
    claim,
    classification: "Website-supported",
    sourceUrl: "https://example.com/features",
    quote: claim,
    founderCapability: null,
  };
  expect(
    verifyClaims(
      { positioning: claim },
      [review],
      [{ url: review.sourceUrl!, content: claim }],
      {},
    ).value.positioning,
  ).toBe(claim);
  expect(
    verifyClaims(
      { positioning: claim },
      [review],
      [{ url: review.sourceUrl!, content: "Unrelated website text" }],
      {},
    ).value.positioning,
  ).not.toBe(claim);
  const confirmed = {
    ...review,
    classification: "Founder-confirmed" as const,
    founderCapability: claim,
    sourceUrl: null,
    quote: null,
  };
  expect(
    verifyClaims({ positioning: claim }, [confirmed], [], {
      confirmedCapabilities: [claim],
    }).value.positioning,
  ).toBe(claim);
  const legal = "Our product is POPIA-compliant.";
  expect(
    verifyClaims(
      { positioning: legal },
      [{ ...confirmed, claim: legal, founderCapability: legal }],
      [],
      { confirmedCapabilities: [legal] },
    ).value.positioning,
  ).not.toBe(legal);
  expect(
    verifyClaims(
      { positioning: claim },
      [{ ...review, classification: "Independently verified" }],
      [],
      {},
    ).value.positioning,
  ).not.toBe(claim);
});
it("E changes strategy without mutating founder answers or original product analysis, and supports old schema records", () => {
  const original = JSON.stringify(mockReport),
    answers = JSON.stringify(a);
  const first = make(a),
    second = make(b);
  expect(first.channels[0].name).not.toBe(second.channels[0].name);
  expect(JSON.stringify(mockReport)).toBe(original);
  expect(JSON.stringify(a)).toBe(answers);
  expect(strategySchema.parse(mockStrategy(mockReport, a)).schemaVersion).toBe(
    "2.0",
  );
  const old = structuredClone(mockReport);
  old.outreachTemplates[0].body = "We cut your costs by 50%.";
  expect(safeInitialReport(old, []).outreachTemplates[0].body).not.toContain(
    "50%",
  );
  expect(old.outreachTemplates[0].body).toContain("50%");
});
it("rejects optimistic research, mismatched rankings and missing reply/follow-up effort", () => {
  const s = make(a);
  if (s.schemaVersion !== "3.0") throw Error("Missing assessment");
  const bad = structuredClone(s);
  bad.intelligence.effortBreakdown[0].followUpMinutes = 0;
  expect(() => validateStrategy(bad, a)).toThrow();
  const ranking = structuredClone(s);
  ranking.intelligence.segmentComparison[0].name = "Different buyer";
  expect(() => validateStrategy(ranking, a)).toThrow("comparison");
  const inflated = structuredClone(s);
  inflated.firstTen.batchPlanningTarget = 40;
  expect(() => validateStrategy(inflated, a)).toThrow("optimistic");
});
