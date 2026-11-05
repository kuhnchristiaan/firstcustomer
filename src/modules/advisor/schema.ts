import { z } from "zod";
import {
  compactAdvisorSchema,
  founderContextSchema,
} from "@/modules/advisor-proof/contract";
export const emptyContext = {
  productStage: null,
  resources: { hoursPerWeek: null, monthlyBudget: null },
  previousEfforts: { channels: null, other: null },
};
export const contextSchema = founderContextSchema.superRefine((c, ctx) => {
  const channels = c.previousEfforts.channels;
  if (channels?.includes("None") && channels.length > 1)
    ctx.addIssue({
      code: "custom",
      message: "Choose None or the channels you tried.",
      path: ["previousEfforts", "channels"],
    });
  if (channels?.includes("Other") && !c.previousEfforts.other)
    ctx.addIssue({
      code: "custom",
      message: "Describe the other effort, or skip it.",
      path: ["previousEfforts", "other"],
    });
  if (
    c.resources.monthlyBudget &&
    !/^[A-Z]{3}$/.test(c.resources.monthlyBudget.currency)
  )
    ctx.addIssue({
      code: "custom",
      message: "Use a three-letter currency code.",
      path: ["resources", "monthlyBudget", "currency"],
    });
});
export type FounderContext = z.infer<typeof contextSchema>;
export function advisorSchema(ids: [string, ...string[]]) {
  const base = compactAdvisorSchema(ids);
  return base.extend({
    schemaVersion: z.literal("advisor/1"),
    channel: base.shape.channel.extend({
      accessCheck: z.string().min(1),
      fallback: z.string().min(1),
    }),
    tasks: z
      .array(base.shape.tasks.element.extend({ title: z.string().min(1) }))
      .min(3)
      .max(5),
  });
}
export type AdvisorStrategy = z.infer<ReturnType<typeof advisorSchema>>;
export const assistInputSchema = z.strictObject({
  strategyId: z.string().min(1),
  action: z.enum(["explain", "task"]),
  taskId: z.string().optional(),
});
// A resource publication check only: no semantic grader or repair pipeline.
export function checkResources(s: AdvisorStrategy, c: FounderContext) {
  const available =
    c.resources.hoursPerWeek === null
      ? s.resources.availableMinutes
      : Math.floor(c.resources.hoursPerWeek * 60);
  const planned = s.tasks.reduce((sum, t) => sum + t.minutes, 0);
  const spend = s.tasks.reduce((sum, t) => sum + t.directCost, 0);
  if (
    s.resources.availableMinutes !== available ||
    planned > Math.floor(available * 0.85) ||
    spend > s.resources.experimentBudget ||
    (c.resources.monthlyBudget &&
      (s.resources.currency !== c.resources.monthlyBudget.currency ||
        s.resources.experimentBudget > c.resources.monthlyBudget.amount))
  )
    throw new Error(
      "The plan exceeds available resources or leaves no execution headroom.",
    );
}
