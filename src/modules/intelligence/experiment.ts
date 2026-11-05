import { z } from "zod";

const note = z.string().min(8).max(300);
/** Required for newly generated initial reports; optional in historical JSON. */
export const firstExperimentSchema = z.strictObject({
  segment: z.string().min(1).max(200),
  problem: note,
  identifyProspects: note,
  channel: z.string().min(1).max(200),
  channelRationale: note,
  firstAction: note,
  activityTarget: z.strictObject({
    quantity: z.number().int().min(1).max(10),
    activity: note,
  }),
  resources: z.strictObject({
    assumedMinutes: z.number().int().min(15).max(120),
    tools: z.array(z.string().min(1).max(100)).min(1).max(4),
    directSpend: z.literal(0),
    assumptions: note,
  }),
  commercialLearning: note,
  continueWhen: note,
  adjustWhen: note,
  stopWhen: note,
  strongestAlternative: z.strictObject({
    channel: note,
    whyNotSelected: note,
    preferWhen: note,
  }),
});

export const firstExperimentInstructions = `Return firstExperiment as an explicit decision contract, not a generic channel label. Name the first-ranked segment and first acquisition-channel title EXACTLY. Define one narrow buyer/workflow problem and a prospect-identification/qualification method that does not invent observations. Include one first action, an activity quantity of 1–10, assumed 15–120 minutes, existing/free tools and zero direct spend; these are provisional experiment assumptions, never facts about the founder. Define commercialLearning as an observable result, distinct from controllable activity. Give continueWhen, adjustWhen and stopWhen; compare the strongest credible alternative and when it would win. Mirror this experiment in acquisitionChannels[0], firstTenPlaybook and week 1 so existing visible fields contain its actionable substance. Later weeks depend on evidence from this same test. Do not invent response rates, CPL/CAC, conversion lifts or audience/traffic. Funnel optimisation requires an explicit existing-traffic assumption and a plan to attract suitable visitors first. For a self-service product, evaluate relevant templates, use-case communities, ecosystem listings or embedded distribution against high-touch sales; select on market dynamics, not a universal channel preference. Keep other fields 8–18 words where possible; use concise complete messages. Put resource, access and purchasing uncertainty in the appropriate evidence fields.`;
