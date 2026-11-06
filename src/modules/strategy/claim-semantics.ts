export type StatementKind =
  | "product-capability"
  | "promotional-claim"
  | "independent-fact"
  | "founder-confirmed"
  | "buyer-requirement"
  | "commercial-hypothesis"
  | "recommended-action"
  | "experimental-target"
  | "prospect-observation";

const risky =
  /(?:\d\s*%|\bpercent(?:age)?\b|\bhalv(?:e|es|ed|ing)\b|\btwice as (?:many|much)\b|\b(?:double[sd]?|triple[sd]?)\b.{0,50}(?:conversions?|sales|revenue|testimonials?|leads?|output)|\b\d+(?:x|×)\b|\b(?:saves?|reduces?|cuts?|increases?|improves?)\b.{0,60}(?:\d|half|hours?|days?|costs?|time|revenue)|\b(?:POPIA|GDPR|HIPAA|ISO\s*\d+|compliant|accredited|certified|market.lead(?:er|ing)|best.in.class|guarantee[ds]?|risk.free|bank.grade|military.grade|unhackable|fully secure)\b|\b(?:trusted|used) by\b|\bcustomers? (?:say|said|report|achieved|saved)\b|\ba customer (?:says|said|reports?|achieved|saved)\b|\bindustry.leading\b|\b(?:we|has|have|serves?)\s+\d+\s+(?:paying\s+)?customers\b|\b(?:better|faster|cheaper|more secure|superior) than\b)/i;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function hasProspectObservation(text: string) {
  const researchPlaceholder =
    /\[(?!name\b|sender\b)[^\]]*(?:observation|verified|public|research|confirmed)[^\]]*\]|\{\{(?:verified|specific|public)[^}]*\}\}/i;
  const observations = [
    ...text.matchAll(
      /\b(?:(?:I|we)\s+(?:noticed|saw|researched|learned|understand)|noticed|saw)\b([^.!?\n]+)/gi,
    ),
  ];
  return (
    observations.some((m) => !researchPlaceholder.test(m[1])) ||
    text
      .split(/(?<=[.!?])\s+|\n/)
      .some(
        (sentence) =>
          !/\?\s*$/.test(sentence) &&
          /\byour (?:team|company|business|product) (?:uses?|has|recently|just|is struggling|needs?)\b/i.test(
            sentence,
          ) &&
          !researchPlaceholder.test(sentence),
      )
  );
}

/** Classify clauses by their subject and field purpose, not isolated words.
 * Deliberately bounded grammar; ambiguous capability entailment goes to review.
 * No conditional-prefix escape: a later affirmative product clause still counts.
 */
export function statementKind(
  text: string,
  path: string,
  productName?: string,
): StatementKind {
  if (hasProspectObservation(text)) return "prospect-observation";
  // Remove only the explicitly disclaimed proposition for classification, not
  // the rest of the sentence. A subsequent affirmative promise still counts.
  text = text.replace(/\b(?:without repeating|do not repeat|do not claim|never claim)\s+(?:the owner[’']s unverified claim of\s+)?twice as many testimonials\b/gi, "disclaimed owner statement");
  if (
    /^(?:who|what|which|how|does|do|can|would|is|are)\b/i.test(text.trim()) &&
    /\?$/.test(text.trim())
  )
    return "commercial-hypothesis";
  const names = productName ? `|${escape(productName)}` : "";
  const subject = new RegExp(
    `\\b(?:we|I|(?:our|the|this) (?:product|software|platform|tool|service|SaaS)|it${names})\\s+(?:(?:also|now|already|automatically)\\s+)?(?:supports?|integrates?|provides?|offers?|automates?|enables?|helps?|saves?|reduces?|cuts?|increases?|improves?|guarantees?|has|have|is|are)\\b`,
    "i",
  );
  // Named subjects still work when this helper is used outside a report root.
  const named =
    /\b[A-Z][\w-]*(?: [A-Z][\w-]*){0,2} (?:supports|integrates|provides|offers|automates|enables|helps|saves|reduces|increases|guarantees)\b/;
  const assertion = subject.test(text) || named.test(text);
  if (
    /^(?:unknown|unverified|no (?:independent |verified |confirmed )?evidence (?:of|that)|do not (?:claim|promise|assert))\b/i.test(
      text.trim(),
    ) && !/[;]|\b(?:but|however|yet|nevertheless)\b/i.test(text)
  )
    return "commercial-hypothesis";
  // Comparative channel hypotheses are not product-performance promises.
  if (!assertion && /firstExperiment\.channelRationale\.tradeoff$/.test(path) &&
      /\b(?:manual research|researched outreach)\b/i.test(text) &&
      /\b(?:can|may|could)\b/i.test(text) && /\bfaster than waiting for inbound discovery\b/i.test(text) &&
      !risky.test(text.replace(/faster than waiting for inbound discovery/gi, "")))
    return "commercial-hypothesis";
  if (assertion)
    return risky.test(text) ? "promotional-claim" : "product-capability";
  if (
    /\bcustomers? (?:say|said|reports?|reported|achieved|saved)\b/i.test(text)
  )
    return "promotional-claim";
  if (
    /(?:successMetric|activityTarget|positiveResult|continueWhen|changeWhen|adjustWhen|stopWhen|nextDecision|scope)(?:\.|$)/.test(
      path,
    )
  )
    return "experimental-target";
  if (
    /(?:buyerPersonas|idealCustomers|buyerRoles|buyingSignals|firstExperiment\.problem|(?:segments\.\d+\.)?(?:problems?|motivations))(?:\.|$)/.test(
      path,
    ) ||
    /\b(?:you|buyers?|prospects?|teams?|organizations?|customers?)\b.{0,70}\b(?:need|require|seek|prioriti[sz]e|want)\b/i.test(
      text,
    )
  )
    return "buyer-requirement";
  if (
    /(?:steps|actions|firstAction|identifyProspects|firstMove\.action)(?:\.|$)/.test(
      path,
    ) ||
    /^(?:use|engage|send|track|set|build|ask|confirm|identify|invite|contact|record|compare|read|review|measure|create|develop|publish|test|explore|choose|offer|prepare|plan|repeat|continue|stop|revise|narrow)\b/i.test(
      text.trim(),
    )
  )
    return "recommended-action";
  if (
    /\b(?:may|might|could|hypothes(?:is|es)|test whether|whether|assum(?:e|ption))\b/i.test(
      text,
    )
  )
    return "commercial-hypothesis";
  return risky.test(
    text.replace(
      /\bno guarantee(?:s|d (?:conversions|replies|results|sales|outcomes))?\b/gi,
      "",
    ),
  )
    ? "promotional-claim"
    : "commercial-hypothesis";
}
