"use client";
import { safeInitialReport } from "@/modules/strategy/claims";
import { useState } from "react";
import { Printer, Check, PenLine } from "lucide-react";
import { Button } from "./ui/button";
import { reportSchema, type Report } from "@/modules/intelligence/schema";
type Claim = { text: string; confidence: string; sources: string[] };
const labels: Record<string, string> = {
  overview: "01 · SaaS product assessment",
  offerings: "Products and capabilities",
  problems: "Customer pain points",
  valueProposition: "Value proposition",
  differentiators: "Differentiation to validate",
  idealCustomers: "02 · Three prioritized ideal customer profiles",
  industries: "Target industries",
  buyerPersonas: "Buyer personas",
  geographicFocus: "Geographic focus",
  segments: "03 · Pain points and buying motivations",
  positioning: "04 · Positioning recommendations",
  acquisitionChannels: "05 · Customer acquisition experiments",
  outreachTemplates: "06 · Sales messaging and outreach templates",
  firstTenPlaybook: "07 · Your first 10 customers playbook",
  thirtyDayPlan: "08 · Your 30-day action plan",
  buyingSignals: "Potential buying signals",
  missingInformation: "09 · Assumptions, limitations and validation questions",
};
function humanize(s: string) {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
function OutreachCard({
  message,
}: {
  message: { channel: string; subject: string; body: string };
}) {
  const [status, setStatus] = useState("");
  return (
    <article className="rounded-xl border p-5">
      <h3 className="font-semibold">{message.channel}</h3>
      <p className="my-3 text-sm font-semibold">{message.subject}</p>
      <p className="whitespace-pre-wrap text-sm leading-7">
        {message.body.replace(/\\n/g, "\n")}
      </p>
      <p className="mt-3 text-sm muted">
        Replace every placeholder and verify your product claims before sending.
      </p>
      <Button
        variant="outline"
        className="no-print mt-3"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `${message.subject}\n\n${message.body.replace(/\\n/g, "\n")}`,
            );
            setStatus("Copied");
          } catch {
            setStatus("Copy unavailable. Select and copy the message text.");
          }
        }}
      >
        Copy message
      </Button>
      <span role="status" className="ml-3 text-sm">
        {status}
      </span>
    </article>
  );
}
export function Value({
  value,
  onChange,
  editing,
  label = "",
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  editing: boolean;
  label?: string;
}): React.ReactNode {
  if (
    !editing &&
    Array.isArray(value) &&
    value.length &&
    value.every(
      (v) => v && typeof v === "object" && "name" in v && "buyerRoles" in v,
    )
  )
    return (
      <div className="grid gap-4">
        {(value as Report["segments"]).map((s, i) => (
          <article key={i} className="rounded-xl border p-5">
            <h3 className="text-lg font-semibold">
              {s.priority}. {s.name}
            </h3>
            <p className="my-2 text-sm muted">
              {s.industry} · {s.customerType} · {s.buyerRoles.join(", ")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="font-semibold text-sm">Pain to investigate</h4>
                <p className="text-sm leading-7">{s.problems.join("; ")}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Why they might buy</h4>
                <p className="text-sm leading-7">{s.motivations.join("; ")}</p>
              </div>
            </div>
            <p className="my-3 text-sm leading-7">
              Potential signals: {s.buyingSignals.join("; ")}
            </p>
            <details>
              <summary className="cursor-pointer text-sm underline">
                Evidence and assumptions
              </summary>
              <Value value={s.evidence} editing={false} onChange={() => {}} />
            </details>
          </article>
        ))}
      </div>
    );
  if (
    !editing &&
    Array.isArray(value) &&
    value.length &&
    value.every(
      (v) => v && typeof v === "object" && "week" in v && "rationale" in v,
    )
  )
    return (
      <div className="grid gap-4">
        {(value as Report["thirtyDayPlan"]).map((w) => (
          <article key={w.week} className="rounded-xl border p-5">
            <h3 className="font-semibold">
              Week {w.week} · {w.objective}
            </h3>
            <ul className="my-3 list-disc pl-5 text-sm leading-7">
              {w.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="text-sm leading-7">Review: {w.successMetric}</p>
            <details>
              <summary className="mt-3 cursor-pointer text-sm underline">
                Planning assumptions
              </summary>
              <Value value={w.rationale} editing={false} onChange={() => {}} />
            </details>
          </article>
        ))}
      </div>
    );
  if (
    !editing &&
    Array.isArray(value) &&
    value.length &&
    value.every(
      (v) => v && typeof v === "object" && "subject" in v && "body" in v,
    )
  )
    return (
      <div className="grid gap-4">
        {(value as Report["outreachTemplates"]).map((m, i) => (
          <div key={i}>
            <OutreachCard message={m} />
            {m.rationale && (
              <details className="my-3">
                <summary className="cursor-pointer text-sm underline">
                  Message rationale
                </summary>
                <Value
                  value={m.rationale}
                  editing={false}
                  onChange={() => {}}
                />
              </details>
            )}
          </div>
        ))}
      </div>
    );
  if (typeof value === "string")
    return editing ? (
      <textarea
        aria-label={label || "Finding"}
        value={value}
        rows={value.length > 150 ? 4 : 2}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <p className="whitespace-pre-wrap text-sm leading-7">
        {value.replace(/\\r\\n|\\n/g, "\n")}
      </p>
    );
  if (typeof value === "number")
    return editing ? (
      <input
        type="number"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    ) : (
      <span className="text-sm">{value}</span>
    );
  if (Array.isArray(value))
    return (
      <div className="space-y-4">
        {value.map((v, i) => (
          <div
            key={i}
            className={
              typeof v === "object"
                ? "rounded-xl border border-slate-200 p-5"
                : "border-l-2 border-teal-100 pl-4"
            }
          >
            <Value
              value={v}
              editing={editing}
              label={`${label} ${i + 1}`}
              onChange={(next) =>
                onChange(value.map((old, j) => (j === i ? next : old)))
              }
            />
          </div>
        ))}
      </div>
    );
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("confidence" in obj) {
      const c = obj as Claim;
      return (
        <div className="claim">
          <span className={`badge ${c.confidence.toLowerCase()}`}>
            {c.confidence === "Inferred"
              ? "Hypothesis — needs validation"
              : c.confidence === "Unknown"
                ? "Not established yet"
                : "Website-supported"}
          </span>
          {editing && (
            <select
              aria-label={`${label} confidence`}
              className="mb-3 rounded border p-2 text-xs"
              value={
                c.confidence === "Inferred"
                  ? "Hypothesis — needs validation"
                  : c.confidence === "Unknown"
                    ? "Not established yet"
                    : "Website-supported"
              }
              onChange={(e) => onChange({ ...c, confidence: e.target.value })}
            >
              {["Verified", "Inferred", "Unknown"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
          <Value
            value={c.text}
            editing={editing}
            label={label}
            onChange={(text) => onChange({ ...c, text })}
          />
          {c.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-teal-800">
              {[...new Set(c.sources)].map((s) => (
                <a
                  key={s}
                  href={s}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {s}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide muted">
              {humanize(k)}
            </h3>
            <Value
              value={v}
              editing={editing}
              label={`${label} ${humanize(k)}`}
              onChange={(next) => onChange({ ...obj, [k]: next })}
            />
          </div>
        ))}
      </div>
    );
  }
  return null;
}
export function ReportView({
  initial,
  productId,
  analysisId,
  version = 0,
  mock = false,
  preview = false,
  sections,
}: {
  initial: Report;
  productId?: string;
  analysisId?: string;
  version?: number;
  mock?: boolean;
  preview?: boolean;
  sections?: string[];
}) {
  const [report, setReport] = useState(() => safeInitialReport(initial, []));
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [savedVersion, setSavedVersion] = useState(version);
  const displayLabel = (key: string) =>
    sections ? (labels[key] ?? key).replace(/^\d+ · /, "") : labels[key];
  const keys =
    sections ??
    (preview
      ? ["overview", "idealCustomers", "positioning"]
      : Object.keys(labels));
  return (
    <>
      <div className="no-print mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="badge">
            {savedVersion
              ? `APPROVED VERSION ${savedVersion}`
              : "DRAFT · REVIEW REQUIRED"}
          </span>
          {mock && (
            <span className="badge inferred">
              SAMPLE DATA · NOT YOUR WEBSITE
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={15} />
            Print / PDF
          </Button>
          {productId && (
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              <PenLine size={15} />
              {editing ? "Finish editing" : "Edit findings"}
            </Button>
          )}
        </div>
      </div>
      {!sections && !preview && (
        <section className="report-section panel border-teal-200 bg-teal-50">
          <h2>Your first sales experiment</h2>
          <p className="mb-3 text-sm leading-7">
            Start with {report.segments.find((s) => s.priority === 1)?.name}.
            Test {report.acquisitionChannels[0].title.toLowerCase()} before
            expanding to other channels.
          </p>
          <Value
            value={report.acquisitionChannels[0].recommendation}
            editing={false}
            onChange={() => {}}
          />
          <p className="mt-3 text-sm leading-7">
            First action: {report.acquisitionChannels[0].steps[0]}
          </p>
          <p className="mt-3 text-sm leading-7">
            Review the result: {report.acquisitionChannels[0].successMetric}
          </p>
          <p className="mt-3 text-xs muted">
            This is an unvalidated experiment. Use the optional founder
            questions after the report to fit it to your time and budget.
          </p>
        </section>
      )}
      <nav
        aria-label="Report sections"
        className="panel no-print mb-6 lg:hidden"
      >
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Jump to a report section
          </summary>
          <div className="mt-4 grid gap-3">
            {keys.map((k) => (
              <a key={k} href={`#${k}`} className="text-sm underline">
                {displayLabel(k)}
              </a>
            ))}
          </div>
        </details>
      </nav>
      <div className="report-grid grid items-start gap-8 lg:grid-cols-[210px_1fr]">
        <aside className="no-print sticky top-6 hidden lg:block">
          <p className="eyebrow mb-4">IN THIS REPORT</p>
          <nav className="space-y-3">
            {keys.map((k) => (
              <a
                key={k}
                href={`#${k}`}
                className="block text-xs leading-5 muted hover:text-teal-800"
              >
                {displayLabel(k)}
              </a>
            ))}
          </nav>
        </aside>
        <div>
          <p className="eyebrow mb-3">SAAS SALES STRATEGY</p>
          {sections ? (
            <h2 className="text-3xl font-semibold tracking-tight">
              {report.businessName}
            </h2>
          ) : (
            <h1 className="text-4xl font-semibold tracking-tight">
              {editing ? (
                <input
                  aria-label="Product name"
                  value={report.businessName}
                  onChange={(e) =>
                    setReport({ ...report, businessName: e.target.value })
                  }
                />
              ) : (
                report.businessName
              )}
            </h1>
          )}
          <p className="mt-4 mb-7 text-sm leading-7 muted">
            A focused starting point for finding your first customers. Verified
            means supported by the website; inferred means a hypothesis to test;
            unknown means more information is needed. Targets are experiments,
            not forecasts.
          </p>
          {keys.map((key) => (
            <section id={key} key={key} className="report-section panel">
              <h2>{displayLabel(key)}</h2>
              <Value
                value={report[key as keyof Report]}
                editing={editing}
                label={displayLabel(key)}
                onChange={(v) => setReport({ ...report, [key]: v })}
              />
            </section>
          ))}
          {productId && (
            <div className="panel no-print mt-7">
              <h2 className="font-semibold">Make this plan yours.</h2>
              <p className="mt-2 mb-5 text-sm leading-6 muted">
                Check the recommendations and correct assumptions before
                approving. Approval saves a new version and preserves the
                original analysis. User approval does not independently validate
                AI claims.
              </p>
              <Button
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setMessage("");
                  try {
                    const parsed = reportSchema.safeParse(report);
                    if (!parsed.success)
                      throw new Error(
                        `Please check ${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`,
                      );
                    const r = await fetch(
                      `/api/products/${productId}/profile`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          analysisId,
                          expectedVersion: savedVersion,
                          report,
                        }),
                      },
                    );
                    const data = await r.json();
                    if (!r.ok) throw new Error(data.error);
                    setSavedVersion(data.version);
                    setEditing(false);
                    setMessage(
                      "Approved strategy saved. You can return to it from your workspace.",
                    );
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <Check size={16} />
                {pending ? "Saving…" : "Approve & save strategy"}
              </Button>
              <p role="status" className="mt-4 text-sm">
                {message}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
