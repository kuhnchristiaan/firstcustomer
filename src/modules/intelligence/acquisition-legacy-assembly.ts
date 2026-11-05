import {
  basisSchema,
  validateBasis,
  type ProductProfile,
} from "./product-profile";
import { reportV11Schema } from "./schema";
import {
  basisSections,
  type LegacyAcquisitionStrategy,
} from "./acquisition-legacy";

const inferred = (text: string) => ({
  text,
  confidence: "Inferred" as const,
  sources: [] as string[],
});
/** Presentation only: no new commercial decisions or invented evidence. */
export function assembleLegacyAcquisition(
  s: LegacyAcquisitionStrategy,
  profile: ProductProfile,
) {
  const basis = basisSchema.parse(
    basisSections.map((section) => ({
      section,
      statementIds: s.recommendationBasis[section],
    })),
  );
  validateBasis(basis, profile);
  const primary = s.firstExperiment;
  const decisions = [
    `Continue: ${primary.continueWhen}`,
    `Adjust: ${primary.adjustWhen}`,
    `Stop: ${primary.stopWhen}`,
  ];
  const resources = `Provisional assumption: ${primary.resources.assumedMinutes} minutes; zero direct spend; ${primary.resources.tools.join(", ")}. ${primary.resources.assumptions}`;
  const scope = `Activity cap: ${primary.activityTarget.quantity} ${primary.activityTarget.activity}`;
  const primarySteps = [
    primary.identifyProspects,
    primary.firstAction,
    scope,
    resources,
  ];
  const metric = primary.commercialLearning;
  const steps = [
    {
      title: primary.channel,
      recommendation: inferred(
        `${s.segments[0].name}: ${primary.channelRationale}`,
      ),
      steps: primarySteps,
      successMetric: metric,
    },
    ...s.alternatives.map((a) => ({
      title: a.channel,
      recommendation: inferred(
        `Conditional alternative: ${a.comparison} Prefer only when: ${a.preferWhen}`,
      ),
      steps: [a.firstAction],
      successMetric: `Record evidence of this condition before switching: ${a.preferWhen}`,
    })),
  ];
  const playbook = [
    {
      title: "Test the first buyer",
      recommendation: inferred(s.firstBuyerWhy),
      steps: primarySteps,
      successMetric: metric,
    },
    {
      title: "Test the buying next step",
      recommendation: inferred(s.paymentPath),
      steps: [primary.continueWhen, s.paymentPath],
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
        `Comparative advantage is unvalidated. Test ${s.positioning} against the buyer's current workaround.`,
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
        `${p.tradeoff} ${p.access}${i === 0 ? ` ${s.firstBuyerWhy}` : ""}`,
      ),
    })),
    buyingSignals: [
      inferred(
        `Potential qualification signal to investigate: ${primary.problem} Confirm urgency and buying authority; demand is unverified.`,
      ),
    ],
    missingInformation: s.unknowns.map((text) => ({
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
        rationale: inferred(s.firstBuyerWhy),
      },
      {
        objective: "Review the primary test evidence",
        actions: [primary.commercialLearning, ...decisions],
        successMetric: metric,
        rationale: inferred(primary.channelRationale),
      },
      {
        objective: "Pursue a buying step only after evidence",
        actions: [primary.continueWhen, s.paymentPath],
        successMetric: primary.commercialLearning,
        rationale: inferred(s.paymentPath),
      },
      {
        objective: "Decide whether to repeat, adjust or stop",
        actions: [
          ...decisions,
          `Switch only when an alternative's stated condition is observed; otherwise retain ${primary.channel}.`,
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
        whyNotSelected: s.alternatives[0].comparison,
        preferWhen: s.alternatives[0].preferWhen,
      },
    },
    acquisitionStrategy: s,
  });
}
