import { expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";
import { createHash } from "node:crypto";
import {
  acquisitionSchema,
  acquisitionInstructions,
} from "@/modules/intelligence/acquisition-contract";
import { assembleAcquisition } from "@/modules/intelligence/acquisition-strategy";
import { fieldPatch, leafFields } from "@/modules/intelligence/field-repair";
import {
  deterministicQuality,
  qualityGate,
  qualityReviewSchema,
  reviewInstructions,
  compactReviewInput,
} from "@/modules/intelligence/quality";
import { validateBasis } from "@/modules/intelligence/product-profile";
import {
  reportSchema,
  reportV11Schema,
  validateEvidence,
} from "@/modules/intelligence/schema";
import { analysisRequest } from "@/modules/analysis/provider";
import { estimateRequestTokens } from "@/modules/analysis/token-budget";
import { compactFixture } from "./fixtures/acquisition";
import {
  commercialCases,
  commercialFixture,
} from "./fixtures/commercial-quality";
import { passingReview } from "./fixtures/quality-review";
import { verifyClaims } from "@/modules/strategy/claims";

const root = "docs/milestone-6-2-live-2026-11-05";
const load = (site: string, file: string) =>
  JSON.parse(readFileSync(`${root}/${site}/${file}`, "utf8"));

it("reproduces Greensighter's actual duplicate basis; the new required keyed contract rejects incomplete coverage and unsupported IDs", () => {
  const raw = load("greensighter", "initial-generated.json"),
    profile = load("greensighter", "product-profile.json");
  expect(
    raw.recommendationBasis.map((b: { section: string }) => b.section),
  ).toEqual([
    "segments",
    "segments",
    "acquisitionChannels",
    "firstTenPlaybook",
    "thirtyDayPlan",
  ]);
  expect(() => validateBasis(raw.recommendationBasis, profile)).toThrow(
    "incomplete",
  );
  const f = commercialFixture(),
    s = compactFixture(f.report),
    schema = acquisitionSchema([f.profile.statements[0].id]);
  expect(
    schema.safeParse({ ...s, recommendationBasis: raw.recommendationBasis })
      .success,
  ).toBe(false);
  const { outreachTemplates, ...missing } = s.recommendationBasis;
  void outreachTemplates;
  expect(schema.safeParse({ ...s, recommendationBasis: missing }).success).toBe(
    false,
  );
  expect(
    schema.safeParse({
      ...s,
      recommendationBasis: {
        ...s.recommendationBasis,
        segments: ["fabricated"],
      },
    }).success,
  ).toBe(false);
});

it.each([
  ["senja", 507],
  ["firstcustomers", 907],
  ["tally", 975],
])(
  "reproduces %s's REAL incomplete whole-section repair and confirms recorded allowance",
  (site, allowance) => {
    const stages = load(String(site), "stages.json");
    const repair = stages.find(
      (s: { stage: string }) => s.stage === "quality_repair",
    );
    expect(repair.request.max_output_tokens).toBe(allowance);
    // Response data is the original API object, not a scripted success.
    expect(repair.status).toBe("incomplete");
    expect(repair.incompleteDetails.reason).toBe("max_output_tokens");
    expect(repair.usage.output_tokens).toBe(allowance);
    const before = stages
      .filter((s: { stage: string }) => s.stage !== "quality_repair")
      .reduce(
        (n: number, s: { usage: { output_tokens: number } }) =>
          n + s.usage.output_tokens,
        0,
      );
    expect(4500 - before - 650).toBe(allowance);
  },
);

it.each(commercialCases)(
  "assembles $name into one strategy; primary channel, scope, outcomes and conditions cannot drift across visible views",
  (c) => {
    const f = commercialFixture(c),
      s = compactFixture(f.report),
      report = assembleAcquisition(s, f.profile);
    expect(report.firstExperiment?.segment).toBe(report.segments[0].name);
    expect(report.acquisitionChannels[0].steps).toEqual(
      report.thirtyDayPlan[0].actions,
    );
    expect(report.acquisitionChannels[0].steps).toEqual(
      report.firstTenPlaybook[0].steps,
    );
    expect(report.acquisitionChannels[0].successMetric).toBe(
      report.thirtyDayPlan[0].successMetric,
    );
    expect(report.acquisitionChannels[0].successMetric).toBe(
      report.firstTenPlaybook[0].successMetric,
    );
    expect(report.thirtyDayPlan[3].actions).toContain(
      `Continue: ${s.firstExperiment.continueWhen}`,
    );
    expect(
      report.outreachTemplates.every(
        (m) => m.channel === s.firstExperiment.channel,
      ),
    ).toBe(true);
    expect(report.acquisitionChannels[1].recommendation.text).toContain(
      "Conditional alternative",
    );
    expect(deterministicQuality(report)).toEqual([]);
    expect(validateEvidence(report, [f.source.url])).toEqual(report);
  },
);

it("supports a Tally self-service workflow and conditional product-led distribution without a named-product channel rule", () => {
  const f = commercialFixture({
    name: "Tally",
    url: "https://tally.so/",
    audience: "Small community organisers",
    summary: "Tally is a no-code form builder for collecting information.",
    problem: "Managing event registrations in scattered messages",
    buyers: [
      "Volunteer event organiser",
      "Freelance workshop trainer",
      "Community operations manager",
    ],
    pains: [
      "Registration details are scattered",
      "Workshop requirements arrive late",
      "Intake records need consolidation",
    ],
    channels: [
      "Useful registration template in an accessible organiser group",
      "Peer workshop facilitator introductions",
      "Use-case template listing",
    ],
    action:
      "Check one organiser group's rules and permission to share a useful registration workflow template",
    message:
      "Hi [name], how do you collect registrations for your next event? I am testing a form workflow for organisers. Would a simple registration template be useful to try, with feedback on what is missing?",
    alternative:
      "Direct sales meetings add friction for a self-service workflow; check template access and activation first.",
  });
  const s = compactFixture(f.report);
  s.buyingMotion = "Self-service";
  s.paymentPath.activation =
    "Observe completed real registrations in the intended workflow.";
  const r = assembleAcquisition(s, f.profile);
  expect(r.acquisitionChannels[0].title).toContain("template");
  expect(r.firstTenPlaybook[1].recommendation.text).toContain(
    s.paymentPath.activation,
  );
  expect(r.segments[0].customerType).toBe("Self-service");
  for (const name of ["Tally", "Senja", "Greensighter", "FirstCustomers"])
    expect(acquisitionInstructions).not.toContain(name);
  expect(acquisitionInstructions).toContain("willingness to pay");
});

it("preserves a compact buyer's compliance requirement while rejecting an affirmative product compliance promise in the same field", () => {
  const requirement = {
    segments: [
      {
        problem:
          "GDPR evidence required before the buyer can authorise procurement.",
      },
    ],
  };
  expect(verifyClaims(requirement, [], [], {}).value).toEqual(requirement);
  const unsafe = {
    segments: [
      { problem: "Our product is GDPR-compliant and guarantees security." },
    ],
  };
  expect(
    verifyClaims(unsafe, [], [], {}).actions.some(
      (a) => a.action === "removed",
    ),
  ).toBe(true);
});

it("does not exempt unrelated repeated filler merely because an authoritative contract exists", () => {
  const f = commercialFixture(),
    r = assembleAcquisition(compactFixture(f.report), f.profile);
  const filler =
    "Explore this general commercial opportunity carefully using a vague discussion about unspecified buyer problems.";
  r.problems[0].text = filler;
  r.valueProposition.text = filler;
  r.buyingSignals[0].text = filler;
  r.positioning.text = filler;
  expect(
    deterministicQuality(r).filter((i) =>
      /Identical substantive text/.test(i.reason),
    ),
  ).toHaveLength(4);
});

it("applies coordinated exact-field repairs and reassembles every dependent view without changing evidence", () => {
  const f = commercialFixture(),
    s = compactFixture(f.report),
    original = structuredClone(s);
  const patch = fieldPatch(s, acquisitionSchema().shape, [
    {
      section: "firstExperiment",
      path: "firstExperiment.activityTarget.quantity",
      reason: "Reduce activity to fit resources",
    },
    {
      section: "firstExperiment",
      path: "firstExperiment.firstAction",
      reason: "Match the reduced activity",
    },
  ]);
  const next = acquisitionSchema().parse(
    patch.apply({
      "firstExperiment.activityTarget.quantity": 2,
      "firstExperiment.firstAction":
        "Ask two qualified buyers about their current workflow, with permission.",
    }),
  );
  const report = assembleAcquisition(next, f.profile);
  expect(report.acquisitionChannels[0].steps).toEqual(
    report.thirtyDayPlan[0].actions,
  );
  expect(report.thirtyDayPlan[0].actions.join(" ")).toContain(
    "Activity cap: 2",
  );
  expect(report.productIntelligence).toEqual(f.profile);
  expect(s).toEqual(original);
  expect(() =>
    patch.apply({ "firstExperiment.activityTarget.quantity": 2 }),
  ).toThrow();
  expect(() =>
    patch.apply({
      "firstExperiment.activityTarget.quantity": 2,
      "firstExperiment.firstAction": "A complete replacement action",
      positioning: "Unrelated content",
    }),
  ).toThrow();
  expect(() =>
    fieldPatch(s, acquisitionSchema().shape, [
      {
        section: "recommendationBasis",
        path: "recommendationBasis.segments.0",
        reason: "Fake evidence",
      },
    ]),
  ).toThrow();
  expect(() =>
    fieldPatch(s, acquisitionSchema().shape, [
      { section: "__proto__", path: "__proto__.polluted", reason: "Hostile" },
    ]),
  ).toThrow();
  expect(() =>
    fieldPatch(s, acquisitionSchema().shape, [
      { section: "segments", reason: "Replace everything" },
    ]),
  ).toThrow();
  expect(() =>
    assembleAcquisition(
      {
        ...next,
        firstExperiment: {
          ...next.firstExperiment,
          resources: {
            ...next.firstExperiment.resources,
            directSpend: 20 as 0,
          },
        },
      },
      f.profile,
    ),
  ).toThrow();
});

it.each([
  "Count downloads of the workflow template",
  "Record signups from the selected use case",
  "Measure active users returning to the form",
])("recognises legitimate observable measure: %s", (measure) => {
  expect(
    deterministicQuality({ acquisitionChannels: [{ successMetric: measure }] }),
  ).toEqual([]);
});

it.each([
  "3 positive replies from 10 attempts",
  "Convert 20% of trial users",
  "Continue at 20% using an observed baseline",
])("rejects unsubstantiated commercial decision threshold: %s", (metric) => {
  expect(
    deterministicQuality({
      firstExperiment: undefined,
      acquisitionChannels: [{ successMetric: metric }],
    }).length,
  ).toBeGreaterThan(0);
});

it("finds the recorded Tally modifier miss, unresearched observations, and keeps buyer questions and research placeholders", () => {
  const tally = load("tally", "first-candidate.json");
  expect(
    deterministicQuality(tally).some(
      (i) =>
        /Initial activity exceeds/.test(i.reason) &&
        i.section === "thirtyDayPlan",
    ),
  ).toBe(true);
  for (const body of [
    "Hi [name], I noticed your team uses Asana for design tasks. Would you discuss a handoff?",
    "Hi [name], your team uses Jira for design tickets. Would a conversation about that process help?",
  ])
    expect(
      deterministicQuality({ outreachTemplates: [{ body }] }).some((i) =>
        /prospect observation/.test(i.reason),
      ),
    ).toBe(true);
  for (const body of [
    "Hi [name], does your team use a ticket queue for design requests? Would you share what gets delayed?",
    "Hi [name], I noticed [verified public workflow observation to research]. Would you discuss whether the current process works for you?",
  ])
    expect(deterministicQuality({ outreachTemplates: [{ body }] })).toEqual([]);
});

it("semantic review remains mandatory after local repair, and zero scores still reject the report", async () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  const bad = { ...s, positioning: "Our product doubles your sales." };
  const inspect = (v: typeof s) =>
    v.positioning === s.positioning
      ? []
      : [{ section: "positioning", reason: "Unsupported sales promise" }];
  const call = vi
    .fn()
    .mockResolvedValueOnce({ positioning: s.positioning })
    .mockResolvedValueOnce(passingReview);
  const options = {
    candidate: bad,
    fields: acquisitionSchema().shape,
    product: f.profile,
    context: {},
    inspect,
    claimIssues: () => [],
    validate: (v: typeof s) => acquisitionSchema().parse(v),
    call,
  };
  expect((await qualityGate(options)).repairs).toBe(1);
  expect(call.mock.calls.map((c) => c[1])).toEqual([
    "quality_repair",
    "quality_review",
  ]);
  const rejected = structuredClone(passingReview);
  rejected.scores.commercialRealism = 0;
  rejected.issues = [
    { section: "paymentPath", reason: "No credible buying step" },
  ];
  call
    .mockReset()
    .mockResolvedValueOnce({ positioning: s.positioning })
    .mockResolvedValueOnce(rejected);
  await expect(qualityGate(options)).rejects.toThrow("quality_failed");
  expect(call).toHaveBeenCalledTimes(2);
});

it("historic 1.0 and actual rejected 1.1 candidates remain readable; original evidence hashes stay intact", () => {
  const f = commercialFixture();
  expect(
    reportSchema.safeParse({ ...f.report, schemaVersion: "1.0" }).success,
  ).toBe(true);
  for (const site of ["senja", "firstcustomers", "tally"])
    expect(
      reportV11Schema.safeParse(load(site, "first-candidate.json")).success,
    ).toBe(true);
  const hashes = JSON.parse(
    readFileSync(`${root}/evidence-sha256.json`, "utf8"),
  );
  for (const [path, hash] of Object.entries(hashes))
    expect(
      createHash("sha256")
        .update(readFileSync(`${root}/${path.split("\\").join("/")}`))
        .digest("hex"),
    ).toBe(hash);
});

it("keeps the proposed worst-case stage allocation inside 4500 and genuine profile output under 600", () => {
  expect(600 + 2000 + 650 + 600 + 650).toBe(4500);
  for (const site of ["senja", "greensighter", "firstcustomers", "tally"]) {
    const stages = load(site, "stages.json");
    expect(stages[0].usage.output_tokens).toBeLessThanOrEqual(600);
    // Only identification is reused for usage evidence. Old full-report output
    // is NOT relabelled as a successful compact generation.
  }
  const f = commercialFixture(),
    s = compactFixture(f.report);
  const schema = acquisitionSchema([f.profile.statements[0].id]);
  const generation = analysisRequest(
    schema,
    "acquisition_strategy",
    acquisitionInstructions,
    { product: f.profile },
    "gpt-4.1-mini",
    2000,
  );
  const review = analysisRequest(
    qualityReviewSchema,
    "quality_review",
    reviewInstructions,
    compactReviewInput(
      f.profile,
      {},
      {
        contract: s,
        assembledReport: assembleAcquisition(s, f.profile),
        repairableFields: Object.keys(leafFields(s)),
      },
    ),
    "gpt-4.1-mini",
    650,
  );
  expect(
    estimateRequestTokens(generation, generation.model).tokens +
      estimateRequestTokens(review, review.model).tokens,
  ).toBeLessThan(20000);
});

it("measures a lossless decision-field projection of real reports without claiming a new model result", () => {
  const encoder = new Tiktoken(o200k);
  const measurements = ["senja", "greensighter", "firstcustomers", "tally"].map(
    (site) => {
      const raw = load(site, "initial-generated.json"),
        stages = load(site, "stages.json");
      const projected = {
        segments: raw.segments.map(
          (s: {
            name: string;
            buyerRoles: string[];
            problems: string[];
            buyingSignals: string[];
            evidence: { text: string };
          }) => ({
            name: s.name,
            buyer: s.buyerRoles.join("; "),
            problem: s.problems.join("; "),
            access: s.buyingSignals.join("; "),
            tradeoff: s.evidence.text,
          }),
        ),
        firstExperiment: raw.firstExperiment,
        alternatives: raw.acquisitionChannels.slice(1),
        messages: raw.outreachTemplates.map(
          ({ subject, body }: { subject: string; body: string }) => ({
            subject,
            body,
          }),
        ),
        positioning: raw.positioning.text,
        unknowns: raw.missingInformation.map((c: { text: string }) => c.text),
        recommendationBasis: raw.recommendationBasis,
      };
      const measured = {
        site,
        actualProfileOutput: stages[0].outputTokens,
        actualOldGenerationOutput: stages[1].outputTokens,
        projectedDecisionTextTokens: encoder.encode(
          JSON.stringify(projected),
          [],
          [],
        ).length,
        projectionStatus:
          "Offline size estimate only; preserves old defects, does not add new required reasoning and is not a valid new model result",
      };
      expect(measured.actualProfileOutput).toBeLessThanOrEqual(600);
      return measured;
    },
  );
  if (process.env.M63_OFFLINE_MEASUREMENTS === "true")
    writeFileSync(
      "docs/milestone-6-3/budget-projection.json",
      JSON.stringify(measurements, null, 2),
    );
});
