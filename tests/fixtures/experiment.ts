import { firstExperimentSchema } from "@/modules/intelligence/experiment";
import type { Report } from "@/modules/intelligence/schema";

// Schema/transport fixture only, not a substitute for genuine model evaluation.
export function experimentFor(report: Report) {
  return firstExperimentSchema.parse({
    segment: report.segments[0].name,
    problem: report.segments[0].problems[0],
    identifyProspects: `Manually qualify public roles matching ${report.segments[0].name}; confirm the workflow before making observations`,
    channel: report.acquisitionChannels[0].title,
    channelRationale:
      "Use a reversible test of buyer access before investing in distribution assets",
    firstAction: report.acquisitionChannels[0].steps[0],
    activityTarget: {
      quantity: 3,
      activity:
        "Make at most three manually qualified invitations; record actual responses",
    },
    resources: {
      assumedMinutes: 60,
      tools: ["Existing browser and a private evidence log"],
      directSpend: 0,
      assumptions:
        "Assume an hour and free access for this small test; founder availability and audience access remain unknown",
    },
    commercialLearning:
      "Record whether a buyer confirms urgent pain, buying authority and permission for a commercial next step",
    continueWhen:
      "Continue if a buyer confirms urgent pain and a concrete next step; this is a decision criterion, not a forecast",
    adjustWhen:
      "Adjust the pain or buyer role if relevant people reply but see no urgency",
    stopWhen:
      "Stop the batch if contacts decline or access is unavailable; do not expand spend",
    strongestAlternative: {
      channel: report.acquisitionChannels[1].title,
      whyNotSelected:
        "Requires checking access and preparation before committing founder effort",
      preferWhen:
        "Prefer it if the founder confirms relevant distribution or trusted relationships",
    },
  });
}
