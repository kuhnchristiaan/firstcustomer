import { z } from "zod";
import { qualityRecordSchema } from "@/modules/intelligence/quality";
const note = z.string().min(1).max(500);
const rating = z.enum(["low", "medium", "high", "unknown"]);
export const claimSchema = z.strictObject({
  path: z.string().min(1).max(180),
  claim: note,
  classification: z.enum([
    "Website-supported",
    "Founder-confirmed",
    "Independently verified",
    "Inferred or hypothetical",
    "Unsupported",
  ]),
  sourceUrl: z.string().nullable(),
  quote: z.string().max(1000).nullable(),
  founderCapability: z.string().nullable(),
});
export const assessmentSchema = z.strictObject({
  verdict: z.enum(["keep", "revise"]),
  segmentComparison: z
    .array(
      z.strictObject({
        name: note,
        priority: z.number().int().min(1).max(3),
        factors: z.strictObject({
          productRelevance: rating,
          painSeverity: rating,
          decisionMakerAccess: rating,
          purchasingSimplicity: rating,
          onboardingSimplicity: rating,
          timeFit: rating,
          paymentLikelihood: rating,
          evidenceStrength: rating,
          repeatability: rating,
        }),
        attraction: note,
        acquisitionDifficulty: note,
        unknowns: note,
        validationExperiment: note,
      }),
    )
    .length(3),
  segmentWeaknesses: z.array(note).max(4),
  channelWeaknesses: z.array(note).max(4),
  commercialWeaknesses: z.array(note).max(4),
  corrections: z.array(note).max(6),
  alternativeSegment: z.strictObject({ name: note, preferWhen: note }),
  alternativeChannel: z.strictObject({ name: note, preferWhen: note }),
  firstMoveTradeoff: note,
  experiments: z
    .array(
      z.strictObject({
        channel: note,
        segment: note,
        where: note,
        identifySuitableProspects: note,
        action: note,
        positiveResult: note,
        continueWhen: note,
        changeWhen: note,
        abandonWhen: note,
      }),
    )
    .min(2)
    .max(3),
  effortBreakdown: z
    .array(
      z.strictObject({
        week: z.number().int().min(1).max(4),
        researchMinutes: z.number().int().nonnegative(),
        outreachMinutes: z.number().int().nonnegative(),
        replyMinutes: z.number().int().nonnegative(),
        preparationMinutes: z.number().int().nonnegative(),
        followUpMinutes: z.number().int().nonnegative(),
        uncertainty: note,
      }),
    )
    .length(4),
  claims: z.array(claimSchema).max(40),
});
export const intelligenceSchema = assessmentSchema.extend({
  quality: qualityRecordSchema.optional(),
  claimActions: z.array(
    z.strictObject({
      path: z.string(),
      classification: claimSchema.shape.classification,
      action: z.enum(["retained", "removed"]),
    }),
  ),
  generation: z.strictObject({
    candidateInputTokens: z.number().int().nonnegative(),
    candidateOutputTokens: z.number().int().nonnegative(),
    critiqueInputTokens: z.number().int().nonnegative(),
    critiqueOutputTokens: z.number().int().nonnegative(),
  }),
});
