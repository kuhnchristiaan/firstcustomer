import type { Strategy } from "./schema";

/** Explicit planning heuristics, never measured task times or acquisition forecasts. */
export function allocateEffort(strategy: Strategy) {
  return strategy.weeks.map((week) => {
    const total = week.actions.reduce((n, action) => n + action.minutes, 0);
    const researchMinutes = Math.max(
      Math.floor(total * 0.4),
      week.week === 1 ? strategy.firstTen.batchPlanningTarget * 5 : 1,
    );
    if (researchMinutes + 4 > total)
      throw new Error("Prospect research allocation is too optimistic");
    const remaining = total - researchMinutes;
    const part = Math.floor(remaining / 4);
    return {
      week: week.week,
      researchMinutes,
      preparationMinutes: part,
      outreachMinutes: remaining - part * 3,
      replyMinutes: part,
      followUpMinutes: part,
      uncertainty:
        "Planning heuristic within the task total: at least five minutes per qualified prospect, with preparation, replies and follow-up reserved. Time a small batch before expanding.",
    };
  });
}
