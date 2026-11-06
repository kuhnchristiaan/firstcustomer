import {
  basisSchema,
  validateBasis,
  type ProductProfile,
} from "./product-profile";
import { reportV11Schema } from "./schema";
import {
  basisSections,
  acquisitionSchema,
  buyerReason,
  resourceMinutes,
  type AcquisitionStrategy,
} from "./acquisition-contract";
import { strategyConsistency } from "./strategy-consistency";

const inferred = (text: string) => ({
  text,
  confidence: "Inferred" as const,
  sources: [] as string[],
});
/** Presentation only: no new commercial decisions or invented evidence. */
export function assembleAcquisition(
  s: AcquisitionStrategy,
  profile: ProductProfile,
) {
  s = acquisitionSchema().parse(s);
  const evidenceIssues = strategyConsistency(s, profile);
  if (evidenceIssues.length) throw new Error(evidenceIssues[0].reason);
  const reason = buyerReason(s);
  const paymentSteps = [
    `Verify monetization: ${s.paymentPath.verify}`,
    `Activation: ${s.paymentPath.activation}`,
    `Adoption: ${s.paymentPath.adoption}`,
    `Paid conversion: ${s.paymentPath.paidConversion}`,
  ];
  const payment = paymentSteps.join(" ");
  const basis = basisSchema.parse(
    basisSections.map((section) => ({
      section,
      statementIds: s.recommendationBasis[section],
    })),
  );
  validateBasis(basis, profile);
  const r = s.firstExperiment.resources;
  const { channelDescription, ...experiment } = s.firstExperiment;
  const primary = {
    ...experiment,
    channelRationale: s.firstExperiment.channelRationale.decision,
    resources: {
      assumedMinutes: r.assumedMinutes,
      tools: r.tools.map((t) => t.name),
      directSpend: r.directSpend,
      assumptions: `${r.constraints} No weekly reset; re-scope further work.`,
    },
  };
  const decisions = [
    `Continue: ${primary.continueWhen}`,
    `Adjust: ${primary.adjustWhen}`,
    `Stop: ${primary.stopWhen}`,
  ];
  const resources = `Provisional budget ${r.assumedMinutes} min; planned ${resourceMinutes(s)} min: preparation ${r.preparationMinutes}, research ${r.researchMinutesPerActivity}/activity, execution ${r.executionMinutesPerActivity}/activity, responses ${r.responseMinutes}. Zero direct spend. No weekly reset; re-scope further work. ${r.constraints}`;
  const tools = `Free/public tools: ${r.tools.map((t) => t.name).join(", ")}.`;

  const scope = `Activity cap: ${primary.activityTarget.quantity} ${primary.activityTarget.activity}`;
  const primarySteps = [
    primary.identifyProspects,
    primary.firstAction,
    scope,
    resources,
    tools,
  ];
  const metric = primary.commercialLearning;
  const steps = [
    {
      title: primary.channel,
      recommendation: inferred(
        `${s.segments[0].name}: ${channelDescription} ${primary.channelRationale} Tradeoff: ${s.firstExperiment.channelRationale.tradeoff}`,
      ),
      steps: primarySteps,
      successMetric: metric,
    },
    ...s.alternatives.map((a) => ({
      title: a.channel,
      recommendation: inferred(
        `Conditional alternative: ${a.comparison.benefit} Barrier: ${a.comparison.barrier} Prefer only when: ${a.preferWhen}`,
      ),
      steps: [a.firstAction],
      successMetric: `Record evidence of this condition before switching: ${a.preferWhen}`,
    })),
  ];
  const playbook = [
    {
      title: "Test the first buyer",
      recommendation: inferred(reason),
      steps: primarySteps,
      successMetric: metric,
    },
    {
      title: "Test the buying next step",
      recommendation: inferred(payment),
      steps: [primary.continueWhen, ...paymentSteps, resources, tools],
      successMetric: primary.commercialLearning,
    },
    {
      title: "Repeat only after evidence",
      recommendation: inferred(
        "The first ten paying customers are a goal, not a forecast or conversion promise.",
      ),
      steps: [
        ...decisions,
        `Retain ${s.segments[0].name} and ${primary.channel} unless the evidence supports a conditional alternative.`,
      ],
      successMetric:
        "Record confirmed payments separately from replies, downloads and free users.",
    },
  ];
  const statement = (text: string, urls: string[]) => ({
    text,
    confidence: "Verified" as const,
    sources: urls,
  });
  return reportV11Schema.parse({
    schemaVersion: "1.1",
    businessName: profile.identity.name,
    overview: statement(
      profile.identity.summary,
      profile.identity.evidence.map((e) => e.sourceUrl),
    ),
    offerings: profile.statements
      .filter(
        (p) =>
          p.subject === "Owner product" &&
          ["Website observation", "Owner product claim"].includes(p.kind),
      )
      .map((p) =>
        statement(
          p.text,
          p.evidence.map((e) => e.sourceUrl),
        ),
      ),
    problems: s.segments.map((p) => inferred(p.problem)),
    valueProposition: inferred(s.positioning),
    differentiators: [
      inferred(
        `Comparative advantage is unvalidated. Test ${s.firstBuyerWhy.advantage} against the buyer's current workaround.`,
      ),
    ],
    idealCustomers: s.segments.map((p) => inferred(p.name)),
    industries: [...new Set(s.segments.map((p) => p.market))].map(inferred),
    buyerPersonas: s.segments.map((p) => inferred(p.buyer)),
    geographicFocus: {
      text: "Geography is unknown; check buyer access, language and purchasing requirements before outreach.",
      confidence: "Unknown",
      sources: [],
    },
    segments: s.segments.map((p, i) => ({
      name: p.name,
      industry: p.market,
      customerType: s.buyingMotion,
      buyerRoles: [p.buyer],
      problems: [p.problem],
      motivations: [
        `Hypothesis to validate: willingness to resolve ${p.problem}`,
      ],
      buyingSignals: [p.access],
      priority: i + 1,
      evidence: inferred(
        `${p.tradeoff} ${p.access}${i === 0 ? ` ${reason}` : ""}`,
      ),
    })),
    buyingSignals: [
      inferred(
        `Potential qualification signal to investigate: ${primary.problem} Confirm urgency and buying authority; demand is unverified.`,
      ),
    ],
    missingInformation: [
      ...s.unknowns,
      ...(s.paymentPath.monetizationStatus === "Unknown"
        ? [`SaaS monetization is unverified. ${s.paymentPath.verify}`]
        : []),
    ].map((text) => ({
      text,
      confidence: "Unknown",
      sources: [],
    })),
    positioning: inferred(s.positioning),
    acquisitionChannels: steps,
    outreachTemplates: s.messages.map((m, i) => ({
      ...m,
      channel: primary.channel,
      rationale: inferred(
        i
          ? "Use only following an actual response and permission to continue."
          : `${s.segments[0].name}: ${primary.problem}`,
      ),
    })),
    firstTenPlaybook: playbook,
    thirtyDayPlan: [
      {
        objective: "Prepare and run the primary test",
        actions: primarySteps,
        successMetric: metric,
        rationale: inferred(reason),
      },
      {
        objective: "Review the primary test evidence",
        actions: [primary.commercialLearning, ...decisions, resources, tools],
        successMetric: metric,
        rationale: inferred(primary.channelRationale),
      },
      {
        objective:
          s.paymentPath.monetizationStatus === "Unknown"
            ? "Verify SaaS monetization before a payment test"
            : "Pursue a buying step only after evidence",
        actions: [primary.continueWhen, ...paymentSteps, resources, tools],
        successMetric: primary.commercialLearning,
        rationale: inferred(payment),
      },
      {
        objective: "Decide whether to repeat, adjust or stop",
        actions: [
          ...decisions,
          `Switch only when an alternative's stated condition is observed; otherwise retain ${primary.channel}.`,
          resources,
          tools,
        ],
        successMetric: metric,
        rationale: inferred(
          "Use observed commercial evidence; no assumed conversion rate or automatic scaling.",
        ),
      },
    ].map((w, i) => ({ ...w, week: i + 1 })),
    productIntelligence: profile,
    recommendationBasis: basis,
    firstExperiment: {
      ...primary,
      segment: s.segments[0].name,
      strongestAlternative: {
        channel: `Alternative: ${s.alternatives[0].channel}`,
        whyNotSelected: s.alternatives[0].comparison.barrier,
        preferWhen: s.alternatives[0].preferWhen,
      },
    },
    acquisitionStrategy: s,
  });
}
