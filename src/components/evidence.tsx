"use client";
import { createContext, useContext, type ReactNode } from "react";
import { quotedProductStatements } from "@/modules/intelligence/attribution";
import type { Report } from "@/modules/intelligence/schema";
const EvidenceContext = createContext<string[]>([]);
const ClaimContext = createContext<{ text: string; kind: string }[]>([]);
function sourcesOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourcesOf);
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  return [
    ...(Array.isArray(obj.sources)
      ? obj.sources.filter(
          (s): s is string => typeof s === "string" && /^https?:\/\//.test(s),
        )
      : []),
    ...(typeof obj.sourceUrl === "string" && /^https?:\/\//.test(obj.sourceUrl)
      ? [obj.sourceUrl]
      : []),
    ...Object.values(obj)
      .filter((v) => v && typeof v === "object")
      .flatMap(sourcesOf),
  ];
}
export function EvidenceProvider({
  report,
  children,
}: {
  report: Report;
  children: ReactNode;
}) {
  return (
    <EvidenceContext.Provider value={[...new Set(sourcesOf(report))]}>
      <ClaimContext.Provider
        value={
          report.schemaVersion === "1.1"
            ? quotedProductStatements(report.productIntelligence)
            : []
        }
      >
        {children}
      </ClaimContext.Provider>
    </EvidenceContext.Provider>
  );
}
export function EvidenceLinks({ sources }: { sources: string[] }) {
  const all = useContext(EvidenceContext);
  return (
    <span className="evidence-links">
      {[...new Set(sources)].map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Evidence source ${all.indexOf(url) + 1}: ${url}`}
        >
          {all.includes(url) ? `[${all.indexOf(url) + 1}]` : url}
        </a>
      ))}
    </span>
  );
}
export function SourceReferences() {
  const sources = useContext(EvidenceContext);
  if (!sources.length) return null;
  return (
    <section className="source-references report-section">
      <h2>Source references</h2>
      <p className="text-xs muted">
        Website passages support attribution to the publisher, not independent
        validation of its claims.
      </p>
      <ol>
        {sources.map((url, i) => (
          <li key={url}>
            <span>{i + 1}.</span>
            <a href={url}>{url}</a>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function ProductAttribution({ report }: { report: Report }) {
  if (report.schemaVersion !== "1.1") return null;
  const p = report.productIntelligence;
  return (
    <details className="product-attribution">
      <summary>Product identity and quoted evidence</summary>
      <p className="text-sm leading-7">
        {p.identity.name} · {p.identity.certainty}. Website-supported claims
        describe what the publisher says; they are not independent verification.
      </p>
      <p className="text-xs muted">
        AI interpretation of the product’s job: {p.identity.primaryJob.actor} ·{" "}
        {p.identity.primaryJob.problem} · {p.identity.primaryJob.outcome}. This
        interpretation requires validation.
      </p>
      {p.statements.map((s) => (
        <div key={s.id} className="detail-group">
          <h3 className="reading-label">
            {s.kind} · {s.subject}
          </h3>
          {!s.evidence.some((e) => e.quote === s.text) && (
            <p className="text-sm leading-7">{s.text}</p>
          )}
          {s.evidence.map((e, i) => (
            <blockquote key={i} className="attribution-quote">
              <p>“{e.quote}”</p>
              <EvidenceLinks sources={[e.sourceUrl]} />
            </blockquote>
          ))}
        </div>
      ))}
      {p.limitations.length > 0 && (
        <div className="mt-4">
          <h3 className="reading-label">Attribution limitations</h3>
          {p.limitations.map((t, i) => (
            <p key={i} className="text-xs muted">
              {t}
            </p>
          ))}
        </div>
      )}
    </details>
  );
}

export function ClaimBadge({
  confidence,
  text,
}: {
  confidence: string;
  text: string;
}) {
  const claims = useContext(ClaimContext);
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const ownerClaim = claims.some(
    (s) =>
      s.kind === "Owner product claim" && normalize(s.text) === normalize(text),
  );
  const label =
    confidence === "Inferred"
      ? "Hypothesis — needs validation"
      : confidence === "Unknown"
        ? "Not established yet"
        : ownerClaim
          ? "Website claim"
          : "Website-supported";
  return (
    <span
      className={`badge ${confidence.toLowerCase()}`}
      title={
        ownerClaim && confidence === "Verified"
          ? "Quoted from the publisher’s website; not independently verified."
          : undefined
      }
    >
      {label}
    </span>
  );
}
