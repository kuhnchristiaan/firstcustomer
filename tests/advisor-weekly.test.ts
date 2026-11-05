import { expect, it } from "vitest";
import { weeklyResultsSchema } from "@/modules/advisor/weekly-schema";
const input = { planId: "plan", submissionKey: "e59f812a-73ab-41f9-98b8-5e0ca3af7261", prospectsContacted: 0, replies: null, qualifiedConversations: null, activations: 0, payingCustomers: null, feedback: "No outreach yet.", completedTaskIds: ["task"] };
it("preserves unknown versus zero without deriving acquisition metrics from task completion", () => {
  const result = weeklyResultsSchema.parse(input);
  expect(result.prospectsContacted).toBe(0);
  expect(result.replies).toBeNull();
  expect(result.payingCustomers).toBeNull();
});
it("rejects negative, fractional and malformed metrics", () => {
  for (const value of [-1, 0.5, "3", Infinity]) expect(weeklyResultsSchema.safeParse({ ...input, prospectsContacted: value }).success).toBe(false);
});
