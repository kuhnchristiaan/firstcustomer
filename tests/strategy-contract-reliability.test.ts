import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import {
  acquisitionSchema,
  acquisitionWireSchema,
  resourceMinutes,
} from "@/modules/intelligence/acquisition-contract";
import { legacyAcquisitionSchema } from "@/modules/intelligence/acquisition-legacy";
import { assembleAcquisition } from "@/modules/intelligence/acquisition-strategy";
import { assembleLegacyAcquisition } from "@/modules/intelligence/acquisition-legacy-assembly";
import { strategyConsistency } from "@/modules/intelligence/strategy-consistency";
import { reportSchema, validateEvidence } from "@/modules/intelligence/schema";
import { hasProspectObservation } from "@/modules/strategy/claim-semantics";
import { fieldPatch } from "@/modules/intelligence/field-repair";
import { commercialFixture } from "./fixtures/commercial-quality";
import { compactFixture } from "./fixtures/acquisition";
import { estimateRequestTokens } from "@/modules/analysis/token-budget";
import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";

const root = "docs/model-intelligence-benchmark-2026-11-05";
const load = (p: string) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const cells = [
  ["senja", "gpt-4.1-mini"],
  ["senja", "gpt-6.1-sol"],
  ["tally", "gpt-4.1-mini"],
  ["tally", "gpt-6.1-sol"],
];
const recordedChecks: unknown[] = [];

it.each(cells)(
  "checks original %s/%s without rewriting it or pretending it is a new-model success",
  (site, model) => {
    const raw = load(`${site}/${model}/strategy.json`),
      profile = load(`${site}-profile.json`);
    expect(legacyAcquisitionSchema().safeParse(raw).success).toBe(true);
    expect(acquisitionSchema().safeParse(raw).success).toBe(false); // Explicit new version, never silent migration.
    const issues = strategyConsistency(raw, profile);
    expect(issues.length).toBeGreaterThan(0);
    if (model === "gpt-4.1-mini")
      expect(issues.some((i) => /prospect observation/.test(i.reason))).toBe(
        true,
      );
    if (model === "gpt-6.1-sol") {
      expect(issues.some((i) => /Incomplete strategic/.test(i.reason))).toBe(
        true,
      );
      expect(issues.some((i) => /time allowance/.test(i.reason))).toBe(true);
    }
    if (site === "tally" && model === "gpt-4.1-mini") {
      expect(issues.some((i) => /monetization/.test(i.reason))).toBe(true);
      expect(
        issues.some((i) => /numeric commercial threshold/.test(i.reason)),
      ).toBe(true);
      expect(issues.some((i) => /paid alternative/.test(i.reason))).toBe(true);
    }
    if (site === "tally" && model === "gpt-6.1-sol") {
      expect(issues.some((i) => /services business/.test(i.reason))).toBe(true);
      expect(issues.some((i) => /Overlapping buyer/.test(i.reason))).toBe(true);
      expect(raw.firstExperiment.channel.length).toBeGreaterThan(100);
    }
    // Diagnostic assembly only: corrected compatibility must not certify quality.
    const historical = assembleLegacyAcquisition(raw, profile);
    expect(reportSchema.safeParse(historical).success).toBe(true);
    expect(historical.outreachTemplates[0].channel).toBe(
      raw.firstExperiment.channel,
    );
    expect(historical.acquisitionStrategy).toEqual(raw);
    recordedChecks.push({
      site,
      model,
      originalLegacySchemaValid: true,
      newContractAccepted: false,
      diagnosticAssemblyCompatible: true,
      commercialIssues: issues,
    });
    if (process.env.CONTRACT_RELIABILITY_ARTIFACTS === "true")
      writeFileSync(
        "docs/strategy-contract-reliability/recorded-regressions.json",
        JSON.stringify(recordedChecks, null, 2),
      );
  },
);

it("does not mistake a complete cap-length clause or legitimate buyer requirements for incomplete reasoning", () => {
  const senja = load("senja/gpt-4.1-mini/strategy.json");
  expect(senja.firstBuyerWhy.length).toBe(220);
  expect(
    strategyConsistency(senja).some(
      (i) => i.path === "firstBuyerWhy" && /Incomplete/.test(i.reason),
    ),
  ).toBe(false);
  const s = compactFixture(commercialFixture().report);
  s.firstBuyerWhy.risk =
    "Buyers may require GDPR evidence before procurement approval.";
  expect(acquisitionSchema().safeParse(s).success).toBe(true);
});

it("uses complete reasoning components rather than one 220-character combined decision", () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  s.firstBuyerWhy.advantage =
    "A specific launch deadline may create urgency, while direct authority and a public business route make access testable.";
  s.firstBuyerWhy.risk =
    "A free workaround may be adequate; do not assume that an expressed problem creates a willingness to pay.";
  s.firstBuyerWhy.runnerUpWinsWhen =
    "Prefer the runner-up if conversations demonstrate a more consequential workflow and a confirmed buying next step.";
  expect(JSON.stringify(s.firstBuyerWhy).length).toBeGreaterThan(220);
  const r = assembleAcquisition(acquisitionSchema().parse(s), f.profile);
  expect(r.firstTenPlaybook[0].recommendation.text).toContain(
    s.firstBuyerWhy.advantage,
  );
  expect(r.firstTenPlaybook[0].recommendation.text).toContain(
    s.firstBuyerWhy.risk,
  );
  expect(r.firstTenPlaybook[0].recommendation.text).toContain(
    s.firstBuyerWhy.runnerUpWinsWhen,
  );
  s.firstBuyerWhy.runnerUpWinsWhen = "Prefer the runner-up if a";
  expect(acquisitionSchema().safeParse(s).success).toBe(false);
});

it("treats a stated difference in purchasing process as a hypothesis for review rather than banning similar creative buyers", () => {
  const raw = load("tally/gpt-6.1-sol/strategy.json");
  raw.segments[1].tradeoff =
    "Hypothesis: a procurement approval chain changes this purchasing process; confirm it in interviews before ranking.";
  expect(
    strategyConsistency(raw).some((i) => /Overlapping buyer/.test(i.reason)),
  ).toBe(false);
});

it("checks every presentation expansion at maximum legal field lengths without truncation", () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  const str = (n: number) => "x".repeat(n);
  s.segments = s.segments.map((p, i) => ({
    name: String.fromCharCode(65 + i) + str(99),
    buyer: str(200),
    market: str(100),
    problem: str(220),
    access: str(220),
    tradeoff: str(220),
  }));
  s.firstBuyerWhy = {
    advantage: str(300),
    risk: str(300),
    runnerUpWinsWhen: str(300),
  };
  s.paymentPath = {
    ...s.paymentPath,
    verify: str(300),
    activation: str(300),
    adoption: str(300),
    paidConversion: "Verify " + str(293),
  };
  s.firstExperiment = {
    ...s.firstExperiment,
    channel: str(80),
    channelDescription: str(300),
    channelRationale: { decision: str(300), tradeoff: str(300) },
    problem: str(300),
    identifyProspects: str(300),
    firstAction: str(300),
    commercialLearning: "Record buying authority " + str(276),
    continueWhen: str(300),
    adjustWhen: str(300),
    stopWhen: str(300),
    activityTarget: { quantity: 3, activity: str(300) },
  };
  s.firstExperiment.resources = {
    ...s.firstExperiment.resources,
    constraints: str(220),
    tools: [
      { name: str(60), access: "Free/public" },
      { name: str(60), access: "Free/public" },
    ],
  };
  s.alternatives = s.alternatives.map((a, i) => ({
    channel: String(i) + str(79),
    comparison: { benefit: str(300), barrier: str(300) },
    preferWhen: str(220),
    firstAction: str(220),
  }));
  s.messages = s.messages.map(() => ({ subject: str(120), body: str(450) }));
  s.positioning = str(220);
  s.unknowns = [str(220), str(220), str(220)];
  const accepted = acquisitionSchema().parse(s),
    report = assembleAcquisition(accepted, f.profile);
  expect(reportSchema.safeParse(report).success).toBe(true);
  expect(report.acquisitionStrategy).toEqual(accepted);
  expect(report.outreachTemplates[0].channel).toBe(s.firstExperiment.channel);
  expect(report.acquisitionChannels[0].recommendation.text).toContain(
    s.firstExperiment.channelDescription,
  );
  expect(report.acquisitionChannels[0].recommendation.text).toContain(
    s.firstExperiment.channelRationale.tradeoff,
  );
  expect(report.firstTenPlaybook[1].recommendation.text).toContain(
    s.paymentPath.adoption,
  );
  expect(validateEvidence(report, [f.source.url])).toEqual(report);
});

it("also assembles minimum-length labels and preserves the long channel explanation elsewhere", () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  s.firstExperiment.channel = "DM";
  s.firstExperiment.channelDescription =
    "A permission-based direct message about the selected workflow.";
  s.alternatives[0].channel = "X";
  const r = assembleAcquisition(acquisitionSchema().parse(s), f.profile);
  expect(r.outreachTemplates[0].channel).toBe("DM");
  expect(r.firstExperiment?.strongestAlternative.channel).toBe(
    "Alternative: X",
  );
  expect(r.acquisitionChannels[0].recommendation.text).toContain(
    s.firstExperiment.channelDescription,
  );
});

it("derives phase totals once and carries the same assumptions to all four weeks", () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  expect(resourceMinutes(s)).toBe(36);
  const report = assembleAcquisition(s, f.profile);
  const summary = report.acquisitionChannels[0].steps.find((x) =>
    x.startsWith("Provisional budget"),
  );
  expect(summary).toContain("planned 36 min");
  for (const w of report.thirtyDayPlan) expect(w.actions).toContain(summary);
  expect(report.firstExperiment?.resources.assumedMinutes).toBe(
    s.firstExperiment.resources.assumedMinutes,
  );
  s.firstExperiment.resources.assumedMinutes = 30;
  expect(acquisitionSchema().safeParse(s).success).toBe(false);
  s.firstExperiment.resources.assumedMinutes = 60;
  s.firstExperiment.resources.constraints =
    "Allow three hours for research plus one hour for replies.";
  expect(
    strategyConsistency(s).some((i) => /duplicated prose time/.test(i.reason)),
  ).toBe(true);
});

it("rejects arbitrary scope, underestimated research, paid tools and relabelled outbound; permits a real access-only test", () => {
  const s = compactFixture(commercialFixture().report);
  s.firstExperiment.activityTarget.quantity = 10;
  expect(acquisitionSchema().safeParse(s).success).toBe(false);
  s.firstExperiment.activityTarget.quantity = 3;
  s.firstExperiment.resources.researchMinutesPerActivity = 1;
  expect(acquisitionSchema().safeParse(s).success).toBe(false);
  s.firstExperiment.resources.activityKind = "Self-service asset";
  expect(strategyConsistency(s).some((i) => /relabel/.test(i.reason))).toBe(
    true,
  );
  s.firstExperiment.resources.tools = [
    { name: "LinkedIn InMail", access: "Free/public" },
  ];
  expect(strategyConsistency(s).some((i) => /paid tool/.test(i.reason))).toBe(
    true,
  );
  s.firstExperiment.resources.tools = [
    { name: "Browser", access: "Free/public" },
  ];
  s.firstExperiment.resources.activityKind = "Access check";
  s.firstExperiment.resources.executionMinutesPerActivity = 5;
  s.firstExperiment.activityTarget = {
    quantity: 1,
    activity: "Check permission to share a useful workflow resource.",
  };
  s.firstExperiment.firstAction =
    "Read community rules and check whether a moderator permits a workflow discussion.";
  expect(acquisitionSchema().safeParse(s).success).toBe(true);
});

it("keeps activation/adoption separate from verified SaaS payment and rejects unsupported tiers and services", () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  const r = assembleAcquisition(s, f.profile);
  expect(r.thirtyDayPlan[2].objective).toMatch(/Verify SaaS monetization/);
  expect(r.thirtyDayPlan[2].actions).toContain(
    `Activation: ${s.paymentPath.activation}`,
  );
  expect(r.thirtyDayPlan[2].actions).toContain(
    `Adoption: ${s.paymentPath.adoption}`,
  );
  s.paymentPath.paidConversion =
    "Trial to paid subscription upgrade after form volume justifies payment.";
  expect(acquisitionSchema().safeParse(s).success).toBe(false);
  s.paymentPath.paidConversion =
    "Verify authorization, then sell a paid setup service instead of the SaaS.";
  expect(acquisitionSchema().safeParse(s).success).toBe(false);
  s.paymentPath.paidConversion =
    "Verify the actual SaaS paid offer before seeking confirmed payment for that offer.";
  const action = s.firstExperiment.firstAction;
  s.firstExperiment.firstAction =
    "Sell a \u20ac49 service to set up the form instead of selling the SaaS.";
  expect(acquisitionSchema().safeParse(s).success).toBe(false);
  s.firstExperiment.firstAction = action;
  s.unknowns[0] =
    "A separate, unvalidated consulting offer is a different business hypothesis, not the SaaS acquisition experiment.";
  expect(acquisitionSchema().safeParse(s).success).toBe(true);
  s.paymentPath.monetizationStatus = "Website-supported";
  s.paymentPath.pricingStatementIds = [f.profile.statements[0].id];
  expect(
    strategyConsistency(s, f.profile).some((i) =>
      /Pricing evidence/.test(i.reason),
    ),
  ).toBe(true);
});

it("accepts real owner pricing provenance while refusing to reassign unrelated product evidence", () => {
  const f = commercialFixture(),
    s = compactFixture(f.report),
    id = f.profile.statements[0].id;
  const profile = structuredClone(f.profile);
  profile.statements[0].text = "The paid plan costs $9 per month.";
  s.paymentPath.monetizationStatus = "Website-supported";
  s.paymentPath.pricingStatementIds = [id];
  expect(strategyConsistency(s, profile)).toEqual([]);
  expect(
    strategyConsistency(s, f.profile).some((i) =>
      /Pricing evidence/.test(i.reason),
    ),
  ).toBe(true);
  // This is a synthetic provenance-validator unit test, not fabricated website evidence.
});

it("handles omitted-subject observations without treating research activity labels as prospect facts", () => {
  expect(
    hasProspectObservation(
      "Hi [Name], noticed your great design work. Would a form help?",
    ),
  ).toBe(true);
  expect(
    hasProspectObservation(
      "Hi [Name], noticed you manage multiple clients. Would this help?",
    ),
  ).toBe(true);
  expect(hasProspectObservation("Researched contacts")).toBe(false);
  expect(
    hasProspectObservation(
      "Hi [Name], I noticed [verified public observation to research]. Would you discuss this workflow?",
    ),
  ).toBe(false);
});

it("keeps wire format strict for both model families and pricing provenance immutable during leaf repair", () => {
  const s = compactFixture(commercialFixture().report);
  const format = zodTextFormat(acquisitionWireSchema(), "acquisition_strategy");
  expect(format.strict).toBe(true);
  expect(format.schema.additionalProperties).toBe(false);
  expect(() =>
    fieldPatch(s, acquisitionWireSchema().shape, [
      {
        section: "paymentPath",
        path: "paymentPath.pricingStatementIds.0",
        reason: "Change evidence",
      },
    ]),
  ).toThrow();
  const request = {
    model: "gpt-4.1-mini",
    input: JSON.stringify(s),
    text: { format },
  };
  expect(estimateRequestTokens(request, request.model).tokens).toBeLessThan(
    20000,
  );
  // Lexical estimate of a hand-authored transport fixture, NOT genuine model usage.
  const lexicalOutput = new Tiktoken(o200k).encode(
    JSON.stringify(s),
    [],
    [],
  ).length;
  if (process.env.CONTRACT_RELIABILITY_ARTIFACTS === "true")
    writeFileSync(
      "docs/strategy-contract-reliability/offline-budget.json",
      JSON.stringify(
        {
          mode: "Hand-authored transport fixture; no model call",
          lexicalOutputTokens: lexicalOutput,
          productionGenerationMaxOutputTokens: 2000,
          modelDefaultUnchanged: true,
        },
        null,
        2,
      ),
    );
  expect(lexicalOutput).toBeLessThan(2000);
});

it("preserves every original benchmark artifact hash", () => {
  for (const [p, hash] of Object.entries(load("evidence-sha256.json")))
    expect(
      createHash("sha256")
        .update(readFileSync(`${root}/${p.split("\\").join("/")}`))
        .digest("hex"),
    ).toBe(hash);
});
