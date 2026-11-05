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
    firstBuyerWhy:
      "Hypothesis: fewer approval steps and reachable public roles favour this first buyer; validate urgency.",
    buyingMotion: "Sales-assisted",
    paymentPath:
      "After confirmed urgency, agree scope, buying authority and paid terms; count only confirmed payments as customers.",
    firstExperiment,
    alternatives: report.acquisitionChannels.slice(1, 3).map((c) => ({
      channel: c.title,
      comparison:
        "Requires checking distribution access and preparation before committing effort.",
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
