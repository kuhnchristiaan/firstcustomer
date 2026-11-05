import { reasoningPath, incompleteEnding } from "./completeness";
import type { QualityIssue } from "./quality";
import type { ProductProfile } from "./product-profile";
import { hasProspectObservation } from "@/modules/strategy/claim-semantics";

const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const words: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const number = (s: string) => words[s.toLowerCase()] ?? Number(s);
const numerals =
  "(?:\\d+(?:\\.\\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten)";
const timePattern = new RegExp(
  `\\b(${numerals})\\s*(hours?|hrs?|minutes?|mins?)\\b`,
  "gi",
);
const quotaPattern = new RegExp(
  `\\b(${numerals})\\s+(?:(?:personalized|personalised|qualified|researched|positive|interested|targeted)\\s+){0,3}(emails?|invitations?|prospects?|contacts?|recipients?|replies|responses|users?|signups?)\\b`,
  "gi",
);

/** Bounded, explainable blockers and overlap alerts; semantic review is still
 * necessary for language entailment, market attractiveness and differentiation. */
export function strategyConsistency(
  input: unknown,
  profile?: ProductProfile,
): QualityIssue[] {
  const s = object(input),
    first = object(s.firstExperiment),
    r = object(first.resources);
  const issues: QualityIssue[] = [];
  const add = (path: string, reason: string) =>
    issues.push({ section: path.split(".")[0], path, reason });
  const v2 = s.contractVersion === "2";
  const quantity = Number(object(first.activityTarget).quantity);
  const budget = Number(r.assumedMinutes);
  const paidService =
    /(?:\b(?:paid (?:setup|implementation|consulting)|(?:setup|implementation|consulting) (?:service|fee|pilot))\b|[\u20ac$\u00a3]\s*\d+\s+(?:service|setup|pilot)\b)/i;
  const conditional =
    /\b(?:verif(?:y|ied|ying|ication)|confirm(?:ed|ing|ation)?|unknown|unverified|if (?:verified|confirmed)|before offering|before testing)\b/i;
  const pricing = object(s.paymentPath);
  function visit(value: unknown, path = "") {
    if (Array.isArray(value)) {
      value.forEach((x, i) => visit(x, `${path}.${i}`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([k, x]) =>
        visit(x, path ? `${path}.${k}` : k),
      );
      return;
    }
    if (typeof value !== "string") return;
    if (
      /^(?:recommendationBasis|productIntelligence|quality)\b|(?:StatementIds|sources)\.\d+$/.test(
        path,
      )
    )
      return;
    if (reasoningPath.test(path) && incompleteEnding.test(value))
      add(
        path,
        "Incomplete strategic explanation: finish the reasoning component",
      );
    if (/messages\.\d+\.body$/.test(path) && hasProspectObservation(value))
      add(
        path,
        "Unresearched prospect observation requires a verified research placeholder",
      );
    if (
      /(?:continueWhen|adjustWhen|stopWhen|commercialLearning)$/.test(path) &&
      ([...value.matchAll(quotaPattern)].length || /\d\s*%/.test(value))
    )
      add(
        path,
        "Arbitrary numeric commercial threshold; test observed buying evidence instead",
      );
    if (/(?:firstAction|activityTarget\.activity)$/.test(path)) {
      const counts = [...value.matchAll(quotaPattern)];
      if (counts.some((m) => number(m[1]) !== quantity))
        add(path, "Activity quantity contradicts the numeric primary scope");
    }
    if (
      path === "firstExperiment.firstAction" &&
      /\b(?:send|use|buy|purchase|run|launch|submit)\b[^.!?]{0,50}\b(?:InMail|bid credits|paid ads|paid database|sponsored)\b/i.test(
        value,
      )
    )
      add(
        path,
        "Primary action depends on a potentially paid tool despite a zero-spend assumption",
      );
    if (
      /firstExperiment\.(?:resources\.(?:assumptions|constraints)|firstAction|activityTarget\.activity)$/.test(
        path,
      )
    ) {
      const estimates = [...value.matchAll(timePattern)].map(
        (m) => number(m[1]) * (/^(?:h)/i.test(m[2]) ? 60 : 1),
      );
      if (
        estimates.length &&
        (v2 ||
          estimates.some((n) => n > budget) ||
          (/\bplus\b|\+/.test(value) &&
            estimates.reduce((a, b) => a + b, 0) > budget))
      )
        add(
          path,
          v2
            ? "Use numeric resource components; remove duplicated prose time estimates"
            : "Prose work estimates exceed the numeric time allowance",
        );
    }
    if (
      /^(?:paymentPath|positioning|messages|firstExperiment\.(?:firstAction|channelDescription|commercialLearning|channel))(?:\.|$)/.test(
        path,
      ) &&
      paidService.test(value)
    )
      add(
        path,
        "Primary paid offer changes the existing SaaS into a services business",
      );
    if (
      /^paymentPath(?:\.|$)/.test(path) &&
      !conditional.test(value) &&
      /\b(?:free trial|monthly paid plan|paid subscription|subscription upgrade|upgrade after form volume|paid plan after)\b/i.test(
        value,
      ) &&
      (!v2 || pricing.monetizationStatus === "Unknown")
    )
      add(
        path,
        "Unsupported SaaS monetization assumption: verify the actual offer first",
      );
  }
  visit(s);
  const alternatives = Array.isArray(s.alternatives)
    ? s.alternatives.map(object)
    : [];
  alternatives.forEach((a, i) => {
    if (
      /\b(?:InMail|bid proposals|bid credits|paid database|sponsored ads)\b/i.test(
        `${a.channel} ${a.firstAction}`,
      ) &&
      !/\b(?:confirmed|verified)\b.{0,45}\b(?:budget|access|credits)\b/i.test(
        String(a.preferWhen),
      )
    )
      add(
        `alternatives.${i}.firstAction`,
        "Potentially paid alternative lacks a verified budget/access condition",
      );
  });
  if (
    !v2 &&
    Number.isFinite(quantity) &&
    /\b(?:emails?|personalized|personalised|invitations|research|qualify)\b/i.test(
      `${first.firstAction} ${object(first.activityTarget).activity}`,
    ) &&
    budget < 15 + quantity * 7
  )
    add(
      "firstExperiment.resources.assumedMinutes",
      "Researched outreach volume is unrealistic within the numeric time allowance",
    );
  if (v2) {
    const prep = Number(r.preparationMinutes),
      research = Number(r.researchMinutesPerActivity),
      contact = Number(r.executionMinutesPerActivity),
      response = Number(r.responseMinutes);
    const total = prep + quantity * (research + contact) + response;
    if (total > budget)
      add(
        "firstExperiment.resources.assumedMinutes",
        "Activity work exceeds the numeric resource budget",
      );
    const outbound =
      /\b(?:emails?|personalized|personalised|invitations|outreach|qualify.{0,30}(?:owners|buyers|prospects))\b/i.test(
        `${first.firstAction} ${object(first.activityTarget).activity}`,
      );
    if (
      r.activityKind === "Researched contacts" ||
      (outbound && quantity > 1)
    ) {
      if (15 + quantity * 7 > budget && total <= budget)
        add(
          "firstExperiment.resources.assumedMinutes",
          "Budget cannot fit even the minimum researched-outreach phases",
        );
      if (research < 5)
        add(
          "firstExperiment.resources.researchMinutesPerActivity",
          "Researched prospects need at least five minutes each",
        );
      if (contact < 2)
        add(
          "firstExperiment.resources.executionMinutesPerActivity",
          "Personalized contact needs at least two minutes each",
        );
      if (prep < 10)
        add(
          "firstExperiment.resources.preparationMinutes",
          "Reserve preparation before researched outreach",
        );
      if (response < 5)
        add(
          "firstExperiment.resources.responseMinutes",
          "Reserve time for responses and follow-up",
        );
      if (r.activityKind !== "Researched contacts")
        add(
          "firstExperiment.resources.activityKind",
          "Do not relabel researched outreach to evade its resource requirements",
        );
    } else if (r.activityKind === "Self-service asset" && contact < 15) {
      add(
        "firstExperiment.resources.executionMinutesPerActivity",
        "Reserve at least fifteen execution minutes per self-service asset",
      );
    } else if (r.activityKind === "Access check" && contact < 5) {
      add(
        "firstExperiment.resources.executionMinutesPerActivity",
        "Reserve at least five execution minutes per access check",
      );
    } else if (total < 15)
      add(
        "firstExperiment.resources.preparationMinutes",
        "The access or asset test needs a credible preparation allowance",
      );
    (Array.isArray(r.tools) ? r.tools : []).forEach((t, i) => {
      const tool = object(t);
      if (tool.access !== "Free/public")
        add(
          `firstExperiment.resources.tools.${i}.access`,
          "Unconfirmed tool access cannot be assumed for this experiment",
        );
      if (
        /\b(?:InMail|bid credits|paid database|paid ads)\b/i.test(
          String(tool.name),
        )
      )
        add(
          `firstExperiment.resources.tools.${i}.name`,
          "Unverified or paid tool access contradicts the zero-spend experiment",
        );
    });
    const ids = Array.isArray(pricing.pricingStatementIds)
      ? pricing.pricingStatementIds
      : [];
    if (pricing.monetizationStatus === "Unknown") {
      if (ids.length)
        add(
          "paymentPath.monetizationStatus",
          "Unknown monetization must not claim pricing evidence",
        );
      if (!conditional.test(String(pricing.paidConversion)))
        add(
          "paymentPath.paidConversion",
          "Unknown monetization requires verification before a SaaS payment test",
        );
    } else if (
      !ids.length ||
      (profile &&
        ids.some(
          (id) =>
            !profile.statements.some(
              (st) =>
                st.id === id &&
                st.subject === "Owner product" &&
                ["Owner product claim", "Website observation"].includes(
                  st.kind,
                ) &&
                /\b(?:pricing|paid plan|per month|subscription|upgrade)\b|[$€£]\s*\d/i.test(
                  st.text,
                ),
            ),
        ))
    )
      add(
        "paymentPath.monetizationStatus",
        "Pricing evidence must describe the actual SaaS offer",
      );
    if (
      /\bunlimited\b/i.test(
        profile?.statements.map((st) => st.text).join(" ") ?? "",
      ) &&
      /\b(?:volume|form count|submission limit)\b/i.test(
        String(pricing.paidConversion),
      ) &&
      !conditional.test(String(pricing.paidConversion))
    )
      add(
        "paymentPath.paidConversion",
        "Do not invent a volume paywall for a stated unlimited product",
      );
  }
  const segments = Array.isArray(s.segments) ? s.segments.map(object) : [];
  for (let i = 0; i < segments.length; i++)
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i],
        b = segments[j];
      const workflow = (p: Record<string, unknown>) =>
        `${p.name} ${p.problem}`
          .toLowerCase()
          .replace(/onboarding|kickoff|starting a project/g, "intake")
          .replace(/questionnaire|briefs?/g, "brief");
      const wa = workflow(a),
        wb = workflow(b);
      const role = (v: unknown) =>
        String(v)
          .toLowerCase()
          .replace(/^\d+[.)]?\s*/, "")
          .trim();
      const same = role(a.name) === role(b.name);
      const sharedDesignIntake =
        /design/.test(wa) &&
        /design/.test(wb) &&
        /client/.test(wa) &&
        /client/.test(wb) &&
        /intake|brief/.test(wa) &&
        /intake|brief/.test(wb);
      const distinctHypothesis =
        /\bhypothesis\b.*\b(?:procurement|approval chain|purchasing process)\b/i.test(
          String(b.tradeoff),
        );
      if (same || (sharedDesignIntake && !distinctHypothesis))
        add(
          `segments.${j}.tradeoff`,
          "Overlapping buyer/workflow groups need a distinct buying process or a different segment",
        );
    }
  return issues;
}
