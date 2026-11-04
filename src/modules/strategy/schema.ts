import { z } from "zod";
export const payingOptions = [
  "0",
  "1–10",
  "11–50",
  "51–200",
  "More than 200",
] as const;
export const timeOptions = [
  "Less than 1 hour",
  "1–2 hours",
  "3–5 hours",
  "6–10 hours",
  "More than 10 hours",
] as const;
export const challengeOptions = [
  "I don't know who to sell to",
  "I don't know where to find potential customers",
  "I don't have time for marketing or sales",
  "I struggle to convert prospects",
  "I struggle to convert free users into paying customers",
  "Other",
] as const;
export const channelOptions = [
  "None",
  "Organic social media",
  "Paid advertising",
  "Cold email",
  "LinkedIn outreach",
  "SEO or content marketing",
  "Online communities",
  "Partnerships or referrals",
  "Marketplaces or app directories",
  "Other",
] as const;
export const founderSchema = z
  .strictObject({
    payingCustomers: z.enum(payingOptions).optional(),
    freeUsers: z.number().int().nonnegative().max(100000000).optional(),
    weeklyTime: z.enum(timeOptions).optional(),
    weeklyMinutes: z.number().int().min(1).max(10080).optional(),
    monthlyBudget: z.number().nonnegative().max(100000000).optional(),
    currency: z
      .enum([
        "USD",
        "EUR",
        "GBP",
        "ZAR",
        "CAD",
        "AUD",
        "INR",
        "JPY",
        "NZD",
        "CHF",
      ])
      .optional(),
    challenge: z.enum(challengeOptions).optional(),
    channels: z.array(z.enum(channelOptions)).max(10).optional(),
    geographicTarget: z
      .enum(["My country", "Internationally", "Specific countries or regions"])
      .optional(),
    regions: z.string().trim().min(2).max(200).optional(),
    stage: z.string().trim().max(200).optional(),
    preferredApproach: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.monthlyBudget !== undefined && !v.currency)
      ctx.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Choose a currency for your budget.",
      });
    if (v.channels?.includes("None") && v.channels.length > 1)
      ctx.addIssue({
        code: "custom",
        path: ["channels"],
        message: "Choose None or the channels tried.",
      });
    if (
      v.weeklyMinutes &&
      v.weeklyTime &&
      v.weeklyMinutes > timeCap(v.weeklyTime)
    )
      ctx.addIssue({
        code: "custom",
        path: ["weeklyMinutes"],
        message: "Exact time exceeds the selected range.",
      });
  });
export type FounderContext = z.infer<typeof founderSchema>;
function timeCap(band: FounderContext["weeklyTime"]) {
  return band ? [59, 120, 300, 600, 10080][timeOptions.indexOf(band)] : 10080;
}
export function weeklyAllowance(c: FounderContext) {
  return (
    c.weeklyMinutes ??
    (c.weeklyTime
      ? [45, 60, 180, 360, 660][timeOptions.indexOf(c.weeklyTime)]
      : 60)
  );
}
const text = z.string().min(1).max(1400);
const action = z.strictObject({
  action: text,
  minutes: z.number().int().min(1).max(10080),
});
export const strategySchema = z.strictObject({
  schemaVersion: z.literal("2.0"),
  executiveSummary: text,
  changesFromPrevious: z.array(text).min(1).max(6),
  firstMove: z.strictObject({
    segment: text,
    why: text,
    where: text,
    action: text,
    minutes: z.number().int().positive(),
    message: text,
    continueWhen: text,
    changeWhen: text,
  }),
  prioritizedSegments: z
    .array(
      z.strictObject({
        name: text,
        priority: z.number().int().min(1).max(3),
        rationale: text,
      }),
    )
    .length(3),
  positioning: text,
  channels: z
    .array(
      z.strictObject({
        name: text,
        priority: z.number().int().min(1).max(3),
        rationale: text,
        segment: text,
        weeklyMinutes: z.number().int().nonnegative(),
        monthlyDirectCost: z.number().nonnegative(),
        costCurrency: z.string().min(3).max(3),
        timeHorizonAssumption: text,
        risks: text,
        evidenceLevel: z.literal("Inferred — unvalidated experiment"),
        firstAction: text,
      }),
    )
    .min(2)
    .max(3),
  whyTopChannel: text,
  firstTen: z.strictObject({
    segment: text,
    experiment: text,
    batchPlanningTarget: z.number().int().min(1).max(100),
    targetDisclaimer: z.literal("Experimental planning target, not a forecast"),
    stages: z
      .array(
        z.enum([
          "Prospects identified",
          "Prospects contacted",
          "Qualified conversations",
          "Trial / demo if relevant",
          "Paying customers",
        ]),
      )
      .length(5),
    qualificationQuestions: z.array(text).min(2).max(4),
    objections: z.array(text).min(1).max(3),
    followUp: text,
    changeCriteria: text,
    paymentDefinition: z.literal(
      "A free signup or trial is not a paying customer; count only confirmed payment.",
    ),
  }),
  weeks: z
    .array(
      z.strictObject({
        week: z.number().int().min(1).max(4),
        objective: text,
        actions: z.array(action).min(2).max(3),
        deliverable: text,
        successMetric: text,
        nextDecision: text,
      }),
    )
    .length(4),
  messages: z
    .array(z.strictObject({ channel: text, subject: text, body: text }))
    .min(2)
    .max(3),
  assumptions: z.array(text).min(1).max(8),
  validationQuestions: z.array(text).min(1).max(6),
});
export type Strategy = z.infer<typeof strategySchema>;
export function validateStrategy(
  input: unknown,
  context: FounderContext,
): Strategy {
  const s = strategySchema.parse(input);
  const cap = weeklyAllowance(context);
  if (
    s.firstTen.stages.join("|") !==
    "Prospects identified|Prospects contacted|Qualified conversations|Trial / demo if relevant|Paying customers"
  )
    throw new Error("Invalid acquisition stages");
  if (
    s.firstMove.minutes > cap ||
    s.weeks.some((w) => w.actions.reduce((n, a) => n + a.minutes, 0) > cap)
  )
    throw new Error("Strategy exceeds weekly time allowance");
  if (
    s.weeks
      .map((w) => w.week)
      .sort()
      .join() !== "1,2,3,4" ||
    s.prioritizedSegments
      .map((x) => x.priority)
      .sort()
      .join() !== "1,2,3" ||
    s.channels
      .map((c) => c.priority)
      .sort()
      .join() !== (s.channels.length === 2 ? "1,2" : "1,2,3")
  )
    throw new Error("Invalid priorities or weeks");
  if (s.channels.reduce((n, c) => n + c.weeklyMinutes, 0) > cap)
    throw new Error("Channel effort exceeds weekly allowance");
  if (
    s.channels.some((c) => c.costCurrency !== (context.currency ?? "USD")) ||
    s.channels.reduce((n, c) => n + c.monthlyDirectCost, 0) >
      (context.monthlyBudget ?? 0)
  )
    throw new Error("Strategy exceeds budget or uses wrong currency");
  return s;
}
