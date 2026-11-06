import type { CompactAdvisor } from "./contract";

// All customer-facing fields are rendered verbatim. Never summarize or truncate.
export function strategyMarkdown(s: CompactAdvisor) {
  return [
    `## Start with ${s.buyer.segment}`,
    s.buyer.buyingProblemOrTrigger, s.buyer.whyChosen,
    `## Find them through ${s.channel.name}`,
    s.channel.whereAndHow, s.channel.whyChosen,
    "## Your next seven days",
    ...s.tasks.map((t, i) => `${i + 1}. ${t.instruction}\n\n   Record: ${t.activityToRecord} · ${t.minutes} minutes · ${s.resources.currency} ${t.directCost}`),
    `Time available: ${s.resources.availableMinutes} minutes. Experiment budget: ${s.resources.currency} ${s.resources.experimentBudget}. ${s.resources.basis}`,
    "## Know whether it is working",
    `Collect: ${s.successCriteria.evidenceToCollect}`,
    `Continue: ${s.successCriteria.continueWhen}`,
    `Adjust: ${s.successCriteria.adjustWhen}`,
    `Reconsider: ${s.successCriteria.reconsiderWhen}`,
    "## Important unknowns",
    ...s.importantUnknowns.map((u) => `- ${u}`),
  ].join("\n\n") + "\n";
}

export function strategyObservations(s: CompactAdvisor) {
  const markdown = strategyMarkdown(s);
  const words = markdown.replace(/[#*]/g, "").trim().split(/\s+/u).length;
  const plannedMinutes = s.tasks.reduce((sum, t) => sum + t.minutes, 0);
  const plannedCost = s.tasks.reduce((sum, t) => sum + t.directCost, 0);
  return {
    words, withinReadingTarget: words >= 250 && words <= 450,
    plannedMinutes, plannedCost,
    withinStatedResources: plannedMinutes <= s.resources.availableMinutes && plannedCost <= s.resources.experimentBudget,
    note: "Observations for human review only. No repair, rejection, quality score or claim of commercial acceptance.",
  };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function evaluationHtml(cases: { name: string; context: unknown; output: string; metadata: unknown }[]) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stage 2A — commercial review</title>
<style>body{margin:0;background:#f8f7f3;color:#171c27;font:16px/1.65 system-ui,sans-serif}main{max-width:900px;margin:auto;padding:32px 20px}article{background:white;padding:24px;border:1px solid #dfe2e4;border-radius:12px;margin:24px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}summary{cursor:pointer}h1{line-height:1.2}small{color:#5e6773}</style>
<main><h1>Strategy intelligence proof</h1><p>First-attempt candidate outputs for commercial review. Contexts are hypothetical; saved owner claims are not market evidence. Nothing here is an approved production strategy.</p>
${cases.map((c) => `<article><h2>${escapeHtml(c.name)}</h2><details><summary>Founder context and run details</summary><pre>${escapeHtml(JSON.stringify({ context: c.context, metadata: c.metadata }, null, 2))}</pre></details><pre>${escapeHtml(c.output)}</pre></article>`).join("\n")}
<small>Complete returned content is preserved. No automated quality grading, rewriting or hidden retries.</small></main></html>`;
}
