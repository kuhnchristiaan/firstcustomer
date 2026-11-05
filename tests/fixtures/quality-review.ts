import {
  dimensions,
  qualityReviewSchema,
} from "@/modules/intelligence/quality";
// Scripted transport response, NOT a measurement of a real model's judgment.
export const passingReview = qualityReviewSchema.parse({
  scores: Object.fromEntries(dimensions.map((d) => [d, 2])),
  issues: [],
});
