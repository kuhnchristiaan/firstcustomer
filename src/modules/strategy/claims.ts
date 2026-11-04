import { quotedProductStatements } from "@/modules/intelligence/attribution";
import type { z } from "zod";
import type { claimSchema } from "./critique-schema";
import type { FounderContext } from "./schema";
import type { Report } from "@/modules/intelligence/schema";
export type ClaimReview = z.infer<typeof claimSchema>;
export type ClaimAction = {
  path: string;
  classification: ClaimReview["classification"];
  action: "retained" | "removed";
};
const highRisk =
  /(?:\d\s*%|\bpercent(?:age)?\b|\bhalv(?:e|es|ed|ing)\b|\b\d+(?:x|×)\b|\b(?:saves?|reduces?|cuts?|increases?|improves?)\b.{0,60}(?:\d|half|hours?|days?|costs?|time|revenue)|\b(?:POPIA|GDPR|HIPAA|ISO\s*\d+|compliant|accredited|certified|testimonial|market.lead(?:er|ing)|best.in.class|guarantee[ds]?|risk.free)\b|\b(?:trusted|used) by\b|\bcustomers? (?:say|said|report|achieved|saved)\b|\bindustry.leading\b|\b\d+\s+paying customers\b|\b(?:we|has|have|serves?)\s+\d+\s+(?:paying\s+)?customers\b)/i;
const comparative =
  /\b(?:better|faster|cheaper|more secure|superior) than\b|\b(?:bank.grade|military.grade|unhackable|fully secure)\b/i;
const capability =
  /\b(?:supports|integrates|provides|offers|automates|enables|helps)\b|\b(?:we|I) (?:support|integrate|provide|offer|automate|enable|help)\b/i;
const qualified =
  /^(?:if\b|ask\b|confirm\b|whether\b|unknown\b|unverified\b|do not\b|no (?:evidence|verified|confirmed)\b|test whether\b)/i;
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const missingClaimText =
  "Ask the buyer about their current workflow and validate the relevant product capabilities before making a claim.";
export function verifyClaims<T>(
  input: T,
  reviews: ClaimReview[],
  evidence: { url: string; content: string }[],
  context: FounderContext,
  capabilities = true,
): { value: T; actions: ClaimAction[] } {
  const actions: ClaimAction[] = [];
  function supported(r: ClaimReview) {
    if (r.classification === "Website-supported")
      return Boolean(
        r.quote &&
        r.quote.trim().length >= 12 &&
        evidence.some(
          (s) =>
            s.url === r.sourceUrl &&
            normalize(s.content).includes(normalize(r.quote!)),
        ),
      );
    if (r.classification === "Founder-confirmed")
      return Boolean(
        r.founderCapability &&
        context.confirmedCapabilities?.includes(r.founderCapability) &&
        normalize(r.claim) === normalize(r.founderCapability),
      );
    return false; // No independent research is performed in this milestone.
  }
  function walk(v: unknown, path: string): unknown {
    if (typeof v === "string") {
      if (
        path.endsWith("schemaVersion") ||
        /(?:^|\.)(?:url|sourceUrl|sources\.\d+)$/.test(path)
      )
        return v;
      const fieldReviews = reviews.filter((r) => r.path === path);
      const sentences = v.split(/(?<=[.!?])\s+|\n/);
      const kept = sentences.filter((sentence) => {
        if (!sentence.trim()) return true;
        const matches = fieldReviews.filter((r) => sentence.includes(r.claim));
        const riskText = sentence.replace(
          /\bno guaranteed (?:conversions|replies|results|sales|outcomes)\b/gi,
          "",
        );
        const risky =
          (highRisk.test(riskText) || comparative.test(riskText)) &&
          !qualified.test(sentence.trim());
        const factual =
          capabilities &&
          capability.test(sentence) &&
          !qualified.test(sentence.trim()) &&
          !/^(?:who|what|which|how|does|can)\b/i.test(sentence.trim());
        const allowed =
          !risky &&
          (matches.length
            ? matches.every(
                (r) =>
                  supported(r) ||
                  (r.classification === "Inferred or hypothetical" &&
                    qualified.test(sentence.trim())),
              )
            : !factual);
        if (risky || factual || matches.length)
          actions.push({
            path,
            classification: allowed
              ? (matches.find(supported)?.classification ??
                "Inferred or hypothetical")
              : "Unsupported",
            action: allowed ? "retained" : "removed",
          });
        return allowed;
      });
      if (kept.length === sentences.length) return v;
      return kept.join("\n").trim() || missingClaimText;
    }
    if (Array.isArray(v))
      return v.map((x, i) => walk(x, path ? `${path}.${i}` : String(i)));
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [
          k,
          walk(x, path ? `${path}.${k}` : k),
        ]),
      );
    return v;
  }
  return { value: walk(input, "") as T, actions };
}
export function safeInitialReport(
  report: Report,
  evidence: { url: string; content: string }[],
) {
  const next = structuredClone(report);
  // These quotations were bound to fetched owner blocks before persistence.
  // A publisher's statement is attributable evidence, never independent proof.
  const ownerClaims =
    report.schemaVersion === "1.1"
      ? quotedProductStatements(report.productIntelligence)
      : [];
  const bind = (statement: (typeof ownerClaims)[number]) => ({
    text: statement.text,
    confidence: "Verified" as const,
    sources: [...new Set(statement.evidence.map((ref) => ref.sourceUrl))],
  });
  // Repair only recognizable outputs of the old sanitizer in display copies.
  // Keep original runs and founder-authored text intact in persistent storage.
  const matchesOld = (
    text: string,
    statement: (typeof ownerClaims)[number],
  ) => {
    if (normalize(text) === normalize(statement.text)) return true;
    const prior = verifyClaims({ text: statement.text }, [], [], {}, false)
      .value.text;
    return prior !== missingClaimText && normalize(text) === normalize(prior);
  };
  if (report.schemaVersion === "1.1") {
    const identity = ownerClaims.find(
      (s) => s.text === report.productIntelligence.identity.summary,
    );
    if (
      identity &&
      next.overview.confidence === "Unknown" &&
      matchesOld(next.overview.text, identity)
    )
      next.overview = bind(identity);
    next.offerings = next.offerings.map((claim) => {
      const statement = ownerClaims.find((s) => matchesOld(claim.text, s));
      return claim.confidence === "Unknown" && statement
        ? bind(statement)
        : claim;
    });
  }
  const cleanFact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(cleanFact);
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("confidence" in obj && typeof obj.text === "string") {
        const attributed = ownerClaims.find(
          (s) => normalize(s.text) === normalize(String(obj.text)),
        );
        if (obj.confidence === "Verified" && attributed)
          return { ...obj, ...bind(attributed) };
        const clean = verifyClaims(obj, [], evidence, {}, false).value;
        return JSON.stringify(clean) !== JSON.stringify(obj)
          ? { ...clean, confidence: "Unknown", sources: [] }
          : clean;
      }
      return Object.fromEntries(
        Object.entries(obj).map(([key, child]) => [key, cleanFact(child)]),
      );
    }
    return typeof value === "string"
      ? verifyClaims(value, [], evidence, {}, false).value
      : value;
  };
  for (const key of [
    "overview",
    "offerings",
    "problems",
    "valueProposition",
    "differentiators",
    "geographicFocus",
    "idealCustomers",
    "industries",
    "buyerPersonas",
    "segments",
    "buyingSignals",
    "missingInformation",
  ] as const) {
    (next as unknown as Record<string, unknown>)[key] = cleanFact(next[key]);
  }
  for (const key of [
    "positioning",
    "acquisitionChannels",
    "outreachTemplates",
    "firstTenPlaybook",
    "thirtyDayPlan",
  ] as const)
    (next as unknown as Record<string, unknown>)[key] = verifyClaims(
      next[key],
      [],
      evidence,
      {},
      true,
    ).value;
  return next;
}
