import type { AdvisorStrategy } from "./schema";

export function weeklyDecisionLabel(
  decision: string,
  current: Pick<AdvisorStrategy, "buyer" | "channel">,
  proposed: Pick<AdvisorStrategy, "buyer" | "channel">,
) {
  return decision === "Adjust" &&
    current.buyer.segment === proposed.buyer.segment &&
    current.channel.name === proposed.channel.name
    ? "Keep strategy — adjust execution"
    : decision;
}
