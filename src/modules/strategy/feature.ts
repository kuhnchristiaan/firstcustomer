export function strategyEnabled() {
  return process.env.STRATEGY_REFINEMENT_ENABLED === "true";
}
