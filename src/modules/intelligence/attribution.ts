import type { ProductProfile } from "./product-profile";
import type { Report } from "./schema";
import { normalizeText } from "@/modules/website/document";

export function groundReport(
  report: Report,
  profile: ProductProfile,
  bindIdentity = false,
): Report {
  const next = structuredClone(report);
  const supported = profile.statements.filter(
    (s) =>
      s.subject === "Owner product" &&
      ["Website observation", "Owner product claim"].includes(s.kind),
  );
  const summaries = [
    { text: profile.identity.summary, evidence: profile.identity.evidence },
    ...supported,
  ];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    if (object.confidence === "Verified") {
      const statement = summaries.find(
        (s) => normalizeText(s.text) === normalizeText(String(object.text)),
      );
      if (!statement?.evidence.length) {
        object.confidence = "Unknown";
        object.sources = [];
      } else
        object.sources = [
          ...new Set(statement.evidence.map((r) => r.sourceUrl)),
        ];
    }
    if ("confidence" in object && object.confidence !== "Verified")
      object.sources = [];
    Object.values(object).forEach(walk);
  };
  walk(next);
  if (bindIdentity) {
    next.businessName = profile.identity.name;
    next.overview = {
      text: profile.identity.summary,
      confidence:
        profile.identity.certainty === "Website-supported"
          ? "Verified"
          : "Unknown",
      sources: [...new Set(profile.identity.evidence.map((r) => r.sourceUrl))],
    };
    if (supported.length)
      next.offerings = supported.map((s) => ({
        text: s.text,
        confidence: "Verified",
        sources: [...new Set(s.evidence.map((r) => r.sourceUrl))],
      }));
  }
  return next;
}
export function strategyProductInput(report: Report) {
  if (report.schemaVersion === "1.1")
    return {
      businessName: report.productIntelligence.identity.name,
      profile: generationProductContext(report.productIntelligence),
      recommendationBasis: report.recommendationBasis,
    };
  return {
    businessName: report.businessName,
    overview: report.overview,
    offerings: report.offerings,
    problems: report.problems,
    valueProposition: report.valueProposition,
    differentiators: report.differentiators,
    geographicFocus: report.geographicFocus,
    segments: report.segments,
    missingInformation: report.missingInformation,
    attribution:
      "Legacy report: product subject and quoted evidence were not captured. Request a fresh analysis to resolve attribution uncertainty.",
  };
}
export function generationProductProfile(profile: ProductProfile) {
  return {
    identity: profile.identity,
    statements: profile.statements.filter(
      (s) =>
        s.subject === "Owner product" &&
        ["Website observation", "Owner product claim"].includes(s.kind),
    ),
  };
}
export function profileEvidence(profile: ProductProfile) {
  const refs = [
    ...profile.identity.evidence,
    ...generationProductProfile(profile).statements.flatMap((s) => s.evidence),
  ];
  return [
    ...new Map(
      refs.map((r) => [
        `${r.sourceUrl}#${r.blockId}`,
        { url: r.sourceUrl, content: r.quote },
      ]),
    ).values(),
  ];
}

// The generated statements already contain the exact publisher wording. Keep
// quotation/URL provenance in the stored profile rather than repeat it to AI.
export function generationProductContext(profile: ProductProfile) {
  const { evidence, ...identity } = profile.identity;
  void evidence;
  return {
    identity,
    statements: generationProductProfile(profile).statements.map(
      ({ evidence, ...statement }) => {
        void evidence;
        return statement;
      },
    ),
  };
}

// Shared by safe rendering and confidence badges. Only exact publisher wording
// with the previously captured quote attribution can be called a website claim.
export function quotedProductStatements(profile: ProductProfile) {
  return [
    ...(profile.identity.certainty === "Website-supported"
      ? [
          {
            text: profile.identity.summary,
            kind: "Owner product claim",
            evidence: profile.identity.evidence,
          },
        ]
      : []),
    ...profile.statements.filter(
      (s) =>
        s.subject === "Owner product" &&
        ["Owner product claim", "Website observation"].includes(s.kind),
    ),
  ].filter((s) =>
    s.evidence.some(
      (ref) =>
        normalizeText(ref.quote) === normalizeText(s.text) &&
        ref.blockId &&
        /^https?:\/\//.test(ref.sourceUrl),
    ),
  );
}
