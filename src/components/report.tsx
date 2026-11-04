"use client";
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
            {c.confidence}
          </span>
          {editing && (
            <select
              aria-label={`${label} confidence`}
              className="mb-3 rounded border p-2 text-xs"
              value={c.confidence}
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
  const [report, setReport] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [savedVersion, setSavedVersion] = useState(version);
  const keys =
    sections ??
    (preview
      ? ["overview", "idealCustomers", "positioning"]
      : Object.keys(labels));
  return (
    <>
      <div className="no-print mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="badge">SCHEMA {report.schemaVersion}</span>
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
                {labels[k]}
              </a>
            ))}
          </nav>
        </aside>
        <div>
          <p className="eyebrow mb-3">SAAS SALES STRATEGY</p>
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
          <p className="mt-4 mb-7 text-sm leading-7 muted">
            A focused starting point for finding your first customers. Verified
            means supported by the website; inferred means a hypothesis to test;
            unknown means more information is needed. Targets are experiments,
            not forecasts.
          </p>
          {keys.map((key) => (
            <section id={key} key={key} className="report-section panel">
              <h2>{labels[key]}</h2>
              <Value
                value={report[key as keyof Report]}
                editing={editing}
                label={labels[key]}
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
