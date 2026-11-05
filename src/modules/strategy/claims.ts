import { statementKind } from "./claim-semantics";
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
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const missingClaimText =
  "Ask the buyer about their current workflow and validate the relevant product capabilities before making a claim.";
export type ClaimPolicy = {
  productName?: string;
  pathPrefix?: string;
  /** Only for the semantic-gated path: do not delete ambiguous paraphrases. */
  deferCapabilities?: boolean;
  /** Server-supplied independent evidence; never populate from model labels. */
  independentEvidence?: { url: string; content: string }[];
};
export function verifyClaims<T>(
  input: T,
  reviews: ClaimReview[],
  evidence: { url: string; content: string }[],
  context: FounderContext,
  capabilities = true,
  policy: ClaimPolicy = {},
): { value: T; actions: ClaimAction[] } {
  const actions: ClaimAction[] = [];
  const productName =
    policy.productName ??
    (input && typeof input === "object" && "businessName" in input
      ? String(input.businessName)
      : undefined);
  const quoted = (r: ClaimReview, sources: typeof evidence) =>
    Boolean(
      r.quote &&
      r.quote.trim().length >= 12 &&
      sources.some(
        (s) =>
          s.url === r.sourceUrl &&
          normalize(s.content).includes(normalize(r.quote!)) &&
          normalize(r.quote!).includes(normalize(r.claim)),
      ),
    );
  const support = (
    r: ClaimReview,
    kind: ReturnType<typeof statementKind>,
    sentence: string,
  ) => {
    if (r.classification === "Independently verified")
      return quoted(r, policy.independentEvidence ?? []);
    if (r.classification === "Founder-confirmed")
      return (
        kind !== "promotional-claim" &&
        Boolean(
          r.founderCapability &&
          context.confirmedCapabilities?.includes(r.founderCapability) &&
          normalize(r.claim) === normalize(r.founderCapability),
        )
      );
    if (r.classification === "Website-supported")
      return (
        quoted(r, evidence) &&
        (kind !== "promotional-claim" ||
          /\b(?:according to|the (?:website|publisher) (?:says|claims|states)|publisher.claim)\b/i.test(
            sentence,
          ))
      );
    return (
      r.classification === "Inferred or hypothetical" &&
      [
        "buyer-requirement",
        "commercial-hypothesis",
        "recommended-action",
        "experimental-target",
      ].includes(kind)
    );
  };
  function walk(v: unknown, path: string): unknown {
    if (typeof v === "string") {
      if (
        /(?:^|\.)(?:schemaVersion|confidence|url|sourceUrl|sources\.\d+)$/.test(
          path,
        )
      )
        return v;
      const sentences = v.split(/(?<=[.!?])\s+|\n/);
      const kept = sentences.filter((sentence) => {
        if (!sentence.trim()) return true;
        const kind = statementKind(sentence, path, productName);
        const matches = reviews.filter(
          (r) => r.path === path && sentence.includes(r.claim),
        );
        const supported =
          matches.length > 0 &&
          matches.every((r) => support(r, kind, sentence));
        const quotedOwnerText = sentence
          .replace(
            /^(?:according to (?:the )?(?:publisher|website)|the (?:publisher|website) (?:says|claims|states)),?\s*/i,
            "",
          )
          .replace(/^["“]|["”]$/g, "");
        const attributedPublisher =
          quotedOwnerText !== sentence &&
          quotedOwnerText.length >= 12 &&
          evidence.some((s) =>
            normalize(s.content).includes(normalize(quotedOwnerText)),
          );
        const needsCheck =
          kind === "promotional-claim" ||
          kind === "prospect-observation" ||
          (capabilities && kind === "product-capability");
        const allowed =
          kind !== "prospect-observation" &&
          (!needsCheck ||
            supported ||
            attributedPublisher ||
            (kind === "product-capability" &&
              policy.deferCapabilities === true &&
              !matches.length));
        if (needsCheck || matches.length)
          actions.push({
            path,
            classification: !allowed
              ? "Unsupported"
              : needsCheck
                ? (matches.find((r) => support(r, kind, sentence))
                    ?.classification ??
                  (attributedPublisher
                    ? "Website-supported"
                    : "Inferred or hypothetical"))
                : "Inferred or hypothetical",
            action: allowed ? "retained" : "removed",
          });
        return allowed;
      });
      // No replacement text and no rewrite of valid sentences.
      return kept.length === sentences.length ? v : kept.join("\n").trim();
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
  return { value: walk(input, policy.pathPrefix ?? "") as T, actions };
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
  const cleanFact = (value: unknown, path: string): unknown => {
    if (Array.isArray(value))
      return value.map((v, i) => cleanFact(v, `${path}.${i}`));
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("confidence" in obj && typeof obj.text === "string") {
        const attributed = ownerClaims.find(
          (s) => normalize(s.text) === normalize(String(obj.text)),
        );
        if (obj.confidence === "Verified" && attributed)
          return { ...obj, ...bind(attributed) };
        const clean = verifyClaims(obj, [], evidence, {}, false, {
          productName: report.businessName,
          pathPrefix: path,
        }).value;
        return JSON.stringify(clean) !== JSON.stringify(obj)
          ? { ...clean, confidence: "Unknown", sources: [] }
          : clean;
      }
      return Object.fromEntries(
        Object.entries(obj).map(([key, child]) => [
          key,
          cleanFact(child, `${path}.${key}`),
        ]),
      );
    }
    return typeof value === "string"
      ? verifyClaims(value, [], evidence, {}, false, {
          productName: report.businessName,
          pathPrefix: path,
        }).value
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
    (next as unknown as Record<string, unknown>)[key] = cleanFact(
      next[key],
      key,
    );
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
      {
        productName: report.businessName,
        pathPrefix: key,
        deferCapabilities: true,
      },
    ).value;
  if (next.schemaVersion === "1.1" && next.firstExperiment)
    next.firstExperiment = verifyClaims(
      next.firstExperiment,
      [],
      evidence,
      {},
      true,
      {
        productName: report.businessName,
        pathPrefix: "firstExperiment",
        deferCapabilities: true,
      },
    ).value;
  return next;
}
