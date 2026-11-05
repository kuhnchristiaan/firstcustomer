import { acquisitionSchema } from "@/modules/intelligence/acquisition-contract";
import type { Report } from "@/modules/intelligence/schema";
import { experimentFor } from "./experiment";

// Hand-authored test transport adapter. Never represented as real model output.
export function compactFixture(report: Report) {
  const experiment =
    (report.schemaVersion === "1.1" && report.firstExperiment) ||
    experimentFor(report);
  const { segment, strongestAlternative, ...firstExperiment } = experiment;
  void segment;
  void strongestAlternative;
  const ids =
    report.schemaVersion === "1.1"
      ? report.productIntelligence.statements.map((s) => s.id)
      : ["owner-capability"];
  return acquisitionSchema(ids as [string, ...string[]]).parse({
    contractVersion: "2",
    segments: report.segments.map((s) => ({
      name: s.name,
      buyer: s.buyerRoles[0],
      market: s.industry,
      problem: s.problems[0],
      access:
        "Check public roles and ask permission; access remains unvalidated.",
      tradeoff:
        "Hypothesis: authority and urgency may favour this buyer; confirm access and purchasing needs.",
    })),
    firstBuyerWhy: {
      advantage:
        "Hypothesis: fewer approvals favour this first buyer; validate urgency.",
      risk: "Public role access does not establish willingness to pay.",
      runnerUpWinsWhen:
        "Prefer the runner-up if buyer conversations establish better urgency and access.",
    },
    buyingMotion: "Sales-assisted",
    paymentPath: {
      offerKind: "Existing SaaS",
      monetizationStatus: "Unknown",
      pricingStatementIds: [],
      verify:
        "Check the actual SaaS paid capabilities, price and checkout before a payment test.",
      activation:
        "Observe a buyer completing the intended product workflow with real inputs.",
      adoption:
        "Record whether the buyer returns to use the workflow on another occasion.",
      paidConversion:
        "After verifying the actual SaaS offer, count only confirmed payment for that offer.",
    },
    firstExperiment: {
      ...firstExperiment,
      channelDescription:
        "A reversible test of buyer access using the selected channel.",
      channelRationale: {
        decision: firstExperiment.channelRationale,
        tradeoff:
          "Access and purchasing urgency remain unverified; compare conditional alternatives.",
      },
      resources: {
        assumedMinutes: 60,
        preparationMinutes: 10,
        researchMinutesPerActivity: 5,
        executionMinutesPerActivity: 2,
        responseMinutes: 5,
        activityKind: "Researched contacts",
        tools: [
          { name: "Browser and private evidence log", access: "Free/public" },
        ],
        directSpend: 0,
        constraints:
          "Founder capacity and audience access remain unknown; use only existing free tools.",
      },
    },
    alternatives: report.acquisitionChannels.slice(1, 3).map((c) => ({
      channel: c.title,
      comparison: {
        benefit: "Could reach buyers through a different access route.",
        barrier:
          "Requires checking distribution access before committing effort.",
      },
      preferWhen:
        "Prefer only if observed buyer behaviour and confirmed access justify switching.",
      firstAction:
        "Check access and ask about the workflow before committing effort.",
    })),
    messages: report.outreachTemplates
      .slice(0, 2)
      .map(({ subject, body }) => ({ subject, body })),
    positioning:
      "Test this product against the buyer's existing workaround; urgency and willingness to pay remain unvalidated.",
    unknowns: [
      "Founder time, audience, budget and traction are unknown; confirm before expanding the test.",
    ],
    recommendationBasis: Object.fromEntries(
      [
        "segments",
        "acquisitionChannels",
        "outreachTemplates",
        "firstTenPlaybook",
        "thirtyDayPlan",
      ].map((k) => [k, [ids[0]]]),
    ),
  });
}
