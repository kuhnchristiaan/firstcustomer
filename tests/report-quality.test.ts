import { expect, it, vi } from "vitest";
import {
  deterministicQuality,
  qualityGate,
  reviewIssues,
} from "@/modules/intelligence/quality";
import {
  reportV1Schema,
  reportV11Schema,
  validateEvidence,
} from "@/modules/intelligence/schema";
import { safeInitialReport, verifyClaims } from "@/modules/strategy/claims";
import {
  commercialCases,
  commercialFixture,
} from "./fixtures/commercial-quality";
import { passingReview } from "./fixtures/quality-review";
import { siteFixture } from "./fixtures/product-attribution";
import { mockStrategy } from "@/modules/strategy/mock";
import { strategyV2Schema, validateStrategy } from "@/modules/strategy/schema";

const fields = Object.fromEntries(
  Object.entries(reportV1Schema.shape).filter(
    ([k]) =>
      !["schemaVersion", "businessName", "overview", "offerings"].includes(k),
  ),
);
function options(f = commercialFixture()) {
  return {
    candidate: f.report,
    fields,
    product: f.profile,
    context: { status: "Unknown" },
    validate: (v: typeof f.report) =>
      reportV11Schema.parse(validateEvidence(v, [f.source.url])),
    claimIssues: (v: typeof f.report) => {
      const clean = safeInitialReport(v, []);
      return Object.keys(fields)
        .filter(
          (k) =>
            JSON.stringify(v[k as keyof typeof v]) !==
            JSON.stringify(clean[k as keyof typeof clean]),
        )
        .map((section) => ({ section, reason: "Unsupported assertion" }));
    },
  };
}

it("reproduces Senja's original destructive mechanism without using the old fallback as replacement", () => {
  const commercial = {
    pain: "Agencies cannot collect client testimonials before launch.",
    action: "Identify three agencies and ask about testimonial collection.",
    metric: "Record replies about testimonial publishing delays.",
  };
  // The pre-M6 risk expression matched /testimonial/i in EVERY string.
  expect(Object.values(commercial).every((v) => /testimonial/i.test(v))).toBe(
    true,
  );
  expect(verifyClaims(commercial, [], [], {}).value).toEqual(commercial);
  const removed = verifyClaims(
    { body: "Our product reduces admin time by 50%." },
    [],
    [],
    {},
  );
  expect(removed.value.body).toBe("");
  expect(removed.actions[0].action).toBe("removed");
});

it.each(commercialCases)(
  "accepts a complete hand-authored $name initial regression fixture",
  async (c) => {
    const f = commercialFixture(c),
      opts = options(f);
    expect(deterministicQuality(f.report)).toEqual([]);
    expect(opts.claimIssues(f.report)).toEqual([]);
    const call = vi.fn().mockResolvedValue(passingReview);
    const result = await qualityGate({ ...opts, call });
    expect(result.repairs).toBe(0);
    expect(call).toHaveBeenCalledTimes(1);
    expect(result.value.productIntelligence).toEqual(f.profile);
    expect(result.value.segments.map((s) => s.name)).toEqual(c.buyers);
    expect(result.value.acquisitionChannels[0].steps[0]).toBe(c.action);
    expect(
      new Set(result.value.acquisitionChannels.map((s) => s.title)).size,
    ).toBe(3);
    expect(result.value.outreachTemplates[0].body).toContain("?");
    if (c.name === "FirstCustomers") {
      expect(JSON.stringify(result.value)).not.toContain(
        "diagnoses trial onboarding funnels",
      );
      expect(result.value.segments[0].name).toContain("SaaS founder");
    }
    if (c.name === "Greensighter") {
      expect(result.value.overview.text).toContain("Figma");
      expect(result.value.acquisitionChannels[0].title).not.toContain("Ads");
      expect(result.value.positioning.text).toContain("budget");
    }
  },
);

it.each(commercialCases)(
  "checks founder-refined $name text with the same gate and preserves the initial profile",
  async (c) => {
    const f = commercialFixture(c),
      snapshot = JSON.stringify(f.report);
    const context = {
      weeklyMinutes: 60,
      monthlyBudget: 0,
      currency: "USD" as const,
    };
    const s = mockStrategy(f.report, context);
    // Replace the development mock's generic templates with product-specific text.
    s.messages = f.report.outreachTemplates.map(
      ({ channel, subject, body }) => ({ channel, subject, body }),
    );
    s.prioritizedSegments = f.report.segments.map(
      ({ name, priority, evidence }) => ({
        name,
        priority,
        rationale: evidence.text,
      }),
    );
    const result = await qualityGate({
      candidate: s,
      fields: strategyV2Schema.shape,
      product: f.profile,
      context,
      validate: (v) => strategyV2Schema.parse(validateStrategy(v, context)),
      claimIssues: (v) =>
        verifyClaims(v, [], [], context)
          .actions.filter((a) => a.action === "removed")
          .map((a) => ({
            section: a.path.split(".")[0],
            reason: "Unsupported",
          })),
      initialReview: passingReview,
      call: vi.fn(),
    });
    expect(result.repairs).toBe(0);
    expect(result.value.channels.every((x) => x.monthlyDirectCost === 0)).toBe(
      true,
    );
    expect(JSON.stringify(f.report)).toBe(snapshot);
  },
);

it("repairs only the failing field and freshly reviews the complete result", async () => {
  const f = commercialFixture(),
    original = structuredClone(f.report);
  const bad = structuredClone(f.report);
  bad.outreachTemplates[0].body = "Hi {{name";
  const opts = options(f),
    call = vi
      .fn()
      .mockResolvedValueOnce({
        "outreachTemplates.0.body": original.outreachTemplates[0].body,
      })
      .mockResolvedValueOnce(passingReview);
  const result = await qualityGate({
    ...opts,
    candidate: bad,
    initialReview: passingReview,
    call,
  });
  expect(result.repairs).toBe(1);
  expect(result.value).toEqual(original);
  expect(call.mock.calls.map((c) => c[1])).toEqual([
    "quality_repair",
    "quality_review",
  ]);
  expect(Object.keys(call.mock.calls[0][0].shape)).toEqual([
    "outreachTemplates.0.body",
  ]);
});

it("never permits a targeted patch to replace identity or unrelated sections", async () => {
  const f = commercialFixture();
  f.report.outreachTemplates[0].body = "Hi";
  const call = vi.fn().mockResolvedValue({
    outreachTemplates: [],
    businessName: "Wrong product",
  });
  await expect(
    qualityGate({ ...options(f), initialReview: passingReview, call }),
  ).rejects.toThrow();
  expect(f.report.businessName).toBe("Senja");
  expect(call).toHaveBeenCalledTimes(1);
});

it("rejects a failed repair without an unbounded loop or a fallback report", async () => {
  const f = commercialFixture();
  f.report.outreachTemplates[0].body = "Hi";
  const call = vi
    .fn()
    .mockResolvedValueOnce({
      "outreachTemplates.0.body": f.report.outreachTemplates[0].body,
    })
    .mockResolvedValueOnce(passingReview);
  await expect(
    qualityGate({ ...options(f), initialReview: passingReview, call }),
  ).rejects.toThrow("quality_failed");
  expect(call).toHaveBeenCalledTimes(1); // No paid rereview of a still-broken patch.
});

it("blocks repetitive instructions, incomplete messages, invalid metrics and unrealistic outcomes deterministically", () => {
  const r = structuredClone(commercialFixture().report);
  const filler =
    "Ask the buyer about their current workflow and validate the relevant product capabilities before making a claim.";
  r.problems[0].text = filler;
  r.valueProposition.text = filler;
  r.buyingSignals[0].text = filler;
  r.positioning.text = filler;
  r.outreachTemplates[0].body = "Hi [name],";
  r.thirtyDayPlan[0].successMetric = "Grow";
  r.thirtyDayPlan[0].actions[0] = "Generate 50 demo requests in week one";
  const issues = deterministicQuality(r);
  for (const section of [
    "problems",
    "valueProposition",
    "buyingSignals",
    "positioning",
    "outreachTemplates",
    "thirtyDayPlan",
  ])
    expect(issues.some((x) => x.section === section)).toBe(true);
});

it.each([
  [
    "channelSuitability",
    "acquisitionChannels",
    "Paid LinkedIn ads lack a known budget and conversion economics",
  ],
  [
    "consistency",
    "thirtyDayPlan",
    "Week two scales ads despite selecting community discussion and no positive results",
  ],
  [
    "productRelevance",
    "positioning",
    "Testimonials product is presented as onboarding analytics",
  ],
  [
    "segmentDifferentiation",
    "segments",
    "Same buyer and problem relabelled three times",
  ],
] as const)(
  "semantic %s defects trigger a field repair even when schema-valid",
  async (dimension, section, reason) => {
    const opts = options(),
      review = structuredClone(passingReview);
    review.scores[dimension] = 0;
    const path = (
      {
        acquisitionChannels: "acquisitionChannels.0.recommendation.text",
        thirtyDayPlan: "thirtyDayPlan.0.objective",
        positioning: "positioning.text",
        segments: "segments.0.evidence.text",
      } as Record<string, string>
    )[section];
    review.issues = [{ section: path, reason }];
    const call = vi
      .fn()
      .mockResolvedValueOnce({
        [path]: path
          .split(".")
          .reduce(
            (v: unknown, k) => (v as Record<string, unknown>)[k],
            opts.candidate,
          ),
      })
      .mockResolvedValueOnce(review);
    await expect(
      qualityGate({ ...opts, initialReview: review, call }),
    ).rejects.toThrow("quality_failed");
    expect(Object.keys(call.mock.calls[0][0].shape)).toEqual([path]);
  },
);

it("retains attributed publisher promises but blocks unsupported repetition in sales messages", () => {
  const f = commercialFixture();
  f.report.outreachTemplates[0].body =
    "Hi [name], our product doubles your conversions and reduces admin time by 50%. Want a demo?";
  expect(
    options(f)
      .claimIssues(f.report)
      .map((x) => x.section),
  ).toContain("outreachTemplates");
  const forged = verifyClaims(
    { positioning: "The product integrates with Salesforce." },
    [
      {
        path: "positioning",
        claim: "The product integrates with Salesforce.",
        classification: "Website-supported",
        sourceUrl: f.source.url,
        quote: f.profile.statements[0].text,
        founderCapability: null,
      },
    ],
    [{ url: f.source.url, content: f.profile.statements[0].text }],
    {},
  );
  expect(forged.value.positioning).toBe("");
});

it("requires coherent scores and complete review dimensions rather than accepting a self-declared pass", () => {
  const bad = structuredClone(passingReview);
  bad.scores.claimSafety = 0;
  expect(() => reviewIssues(bad)).toThrow("inconsistent");
});

it("does not mistake a name placeholder for evidence of a prospect's software stack", () => {
  const r = commercialFixture(commercialCases[1]).report;
  r.outreachTemplates[0].body =
    "Hi {{name}}, I noticed your team uses Jira/Asana for product design tickets. Would you try a design ticket with Greensighter?";
  expect(deterministicQuality(r)).toContainEqual({
    section: "outreachTemplates",
    reason: "Unsubstantiated prospect observation: outreachTemplates.0.body",
  });
});

it("keeps Senja's multiplier as an owner quotation while rejecting it as an unverified sales promise", () => {
  const text = "With Senja you'll collect twice as many testimonials.";
  const f = siteFixture({
    name: "Senja",
    url: "https://senja.io/",
    audience: "Course creators",
    problem: "Collecting learner feedback",
    summary: text,
    demoName: "ExampleCRM",
    demo: "An unrelated illustrative CRM",
    markup: 'data-content-kind="illustrative"',
  });
  const report = {
    ...f.report,
    schemaVersion: "1.1" as const,
    productIntelligence: f.profile,
    recommendationBasis: f.basis,
  };
  expect(safeInitialReport(report, []).overview).toEqual({
    text,
    confidence: "Verified",
    sources: [f.source.url],
  });
  expect(verifyClaims({ body: text }, [], [], {}).value.body).toBe("");
  expect(
    verifyClaims({ body: "Our product doubles your conversions." }, [], [], {})
      .value.body,
  ).toBe("");
});
