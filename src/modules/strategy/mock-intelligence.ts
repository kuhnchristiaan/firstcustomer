import type { Report } from "@/modules/intelligence/schema";
import {
  validateStrategy,
  type Strategy,
  type FounderContext,
  weeklyAllowance,
} from "./schema";
export function mockIntelligence(
  report: Report,
  context: FounderContext,
  candidate: Strategy,
): Strategy {
  const cap = weeklyAllowance(context),
    complex = /enterprise|procurement|complex integration/i.test(
      JSON.stringify([report.overview, report.segments]),
    );
  const assessment = {
    verdict: "keep",
    segmentComparison: candidate.prioritizedSegments.map((s) => ({
      name: s.name,
      priority: s.priority,
      factors: {
        productRelevance: "medium",
        painSeverity: "unknown",
        decisionMakerAccess: s.priority === 1 ? "high" : "unknown",
        purchasingSimplicity:
          complex && /enterprise/i.test(s.name) ? "low" : "medium",
        onboardingSimplicity: complex ? "low" : "unknown",
        timeFit: s.priority === 1 ? "high" : "medium",
        paymentLikelihood: "unknown",
        evidenceStrength: "low",
        repeatability: "unknown",
      },
      attraction: `${s.name} is a product-fit hypothesis, not demonstrated demand.`,
      acquisitionDifficulty: complex
        ? "Enterprise procurement, buyer access and integration effort may exceed founder capacity."
        : "Buyer access and urgency require confirmation.",
      unknowns:
        "Purchasing authority, willingness to pay and onboarding effort are unconfirmed.",
      validationExperiment: `Use a small ${Math.min(2, Math.floor(cap / 5))}-contact problem interview batch before expanding.`,
    })),
    segmentWeaknesses: [
      "Original rankings do not establish access or willingness to pay.",
    ],
    channelWeaknesses: [
      "No channel has external validation; confirm audience access before allocating more time.",
    ],
    commercialWeaknesses: complex
      ? [
          "Long procurement and onboarding cycles may make enterprise acquisition impractical at this time.",
        ]
      : ["Treat paying customers and free users as separate outcomes."],
    corrections: [],
    alternativeSegment: {
      name: candidate.prioritizedSegments[1].name,
      preferWhen:
        "Prefer this segment if the first segment has inaccessible buyers or a complex buying process.",
    },
    alternativeChannel: {
      name: candidate.channels[1].name,
      preferWhen:
        "Prefer the alternative if the founder cannot reach relevant buyers through the primary experiment.",
    },
    firstMoveTradeoff: complex
      ? "A smaller reachable team can be preferable to an enterprise budget when procurement and onboarding consume the available time."
      : "Prefer a small direct learning experiment over broad campaigns until buyer access and urgency are confirmed.",
    experiments: candidate.channels.map((c) => ({
      channel: c.name,
      segment: c.segment,
      where:
        "Use existing consenting contacts or manually verify a relevant public role.",
      identifySuitableProspects:
        "Confirm the buyer role and the relevant problem; do not count an unverified name as qualified.",
      action: c.firstAction,
      positiveResult:
        "A confirmed urgent problem and an agreed next buying step.",
      continueWhen:
        "A relevant buyer confirms urgency and agrees to a next step.",
      changeWhen:
        "No qualified conversation after the small experimental batch.",
      abandonWhen:
        "Buyers deny the problem or the effort exceeds the available time.",
    })),
    effortBreakdown: candidate.weeks.map((w) => {
      const total = w.actions.reduce((n, a) => n + a.minutes, 0);
      const research =
        w.week === 1
          ? Math.max(
              candidate.firstTen.batchPlanningTarget * 5,
              Math.floor(total / 5),
            )
          : Math.floor(total / 5);
      const part = total >= 5 ? Math.floor((total - research) / 4) : 0;
      return {
        week: w.week,
        researchMinutes: total - part * 4,
        outreachMinutes: part,
        replyMinutes: part,
        preparationMinutes: part,
        followUpMinutes: part,
        uncertainty:
          "These are conservative planning allocations, not measured task times.",
      };
    }),
    claims: [],
    claimActions: [],
    generation: {
      candidateInputTokens: 0,
      candidateOutputTokens: 0,
      critiqueInputTokens: 0,
      critiqueOutputTokens: 0,
    },
  };
  return validateStrategy(
    { ...candidate, schemaVersion: "3.0", intelligence: assessment },
    context,
  );
}
