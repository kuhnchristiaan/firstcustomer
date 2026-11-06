import { z } from "zod";
import { advisorSchema, checkResources, type FounderContext } from "./schema";

const metric = z.number().int().nonnegative().max(100000000).nullable();
export const weeklyResultsSchema = z.strictObject({
  planId: z.string().min(1),
  submissionKey: z.uuid(),
  prospectsContacted: metric,
  replies: metric,
  qualifiedConversations: metric,
  activations: metric,
  payingCustomers: metric,
  feedback: z.string().trim().max(12000),
  completedTaskIds: z.array(z.string().min(1)).max(5),
});
export type WeeklyResults = z.infer<typeof weeklyResultsSchema>;

export function weeklyReviewSchema(ids: [string, ...string[]]) {
  return z.strictObject({
    decision: z.enum(["Continue", "Adjust", "Reconsider"]),
    evidenceAssessment: z.string().min(1),
    remainingUncertainty: z.string().min(1),
    changeReason: z.string().min(1),
    proposedPlan: advisorSchema(ids),
  });
}

export function validateWeeklyProposal(
  proposal: z.infer<ReturnType<typeof weeklyReviewSchema>>,
  current: z.infer<ReturnType<typeof advisorSchema>>,
  context: FounderContext,
) {
  checkResources(proposal.proposedPlan, context);
  const materialChange =
    proposal.proposedPlan.buyer.segment !== current.buyer.segment ||
    proposal.proposedPlan.channel.name !== current.channel.name;
  if (materialChange && proposal.decision !== "Reconsider")
    throw new Error(
      "A buyer or channel change must be explicitly proposed as Reconsider.",
    );
  if (
    proposal.decision === "Continue" &&
    (JSON.stringify(proposal.proposedPlan.buyer) !==
      JSON.stringify(current.buyer) ||
      JSON.stringify(proposal.proposedPlan.channel) !==
        JSON.stringify(current.channel))
  )
    throw new Error(
      "Continue must preserve the authoritative buyer and channel.",
    );
  return { proposal, materialChange };
}
