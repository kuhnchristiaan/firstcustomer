"use client";
import { useEffect, useState } from "react";
import { ReportView, Value } from "./report";
import { Button } from "./ui/button";
import { Turnstile } from "./turnstile";
import {
  founderSchema,
  strategySchema,
  payingOptions,
  timeOptions,
  challengeOptions,
  channelOptions,
  weeklyAllowance,
  type FounderContext,
  type Strategy,
} from "@/modules/strategy/schema";
import type { Report } from "@/modules/intelligence/schema";
type Revision = {
  id: string;
  version: number;
  status: string;
  context: FounderContext;
  output: Strategy | null;
  mock: boolean;
  approved: boolean;
  createdAt: string;
  error: string | null;
};
const sectionLabels: Record<string, string> = {
  executiveSummary: "Executive summary",
  firstMove: "Your Recommended First Move",
  prioritizedSegments: "Prioritized customer segments",
  positioning: "Positioning",
  channels: "Recommended acquisition experiments",
  whyTopChannel: "Why this channel comes first",
  firstTen: "First 10 paying customers playbook",
  weeks: "30-day action plan",
  messages: "Sales messaging",
  changesFromPrevious: "What changed and why",
};
export function ProgressiveReport(props: Parameters<typeof ReportView>[0]) {
  const guest = !props.productId,
    endpoint = guest
      ? "/api/guest/refinement"
      : `/api/products/${props.productId}/refinement?analysisId=${props.analysisId}`;
  const [revisions, setRevisions] = useState<Revision[]>([]),
    [selected, setSelected] = useState("initial"),
    [context, setContext] = useState<FounderContext>({}),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState(""),
    [available, setAvailable] = useState(false),
    [turnstileToken, setTurnstileToken] = useState(""),
    [reset, setReset] = useState(0);
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<Strategy | null>(null);
  const current = revisions.find((r) => r.id === selected),
    strategy =
      draft ?? (current?.output ? strategySchema.parse(current.output) : null);
  useEffect(() => {
    let live = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        if (!live) return;
        setAvailable(true);
        setRevisions(d.revisions);
        const latest =
          d.revisions.find((r: Revision) => r.approved) ??
          d.revisions.find((r: Revision) => r.status === "SUCCEEDED");
        if (latest) {
          setSelected(latest.id);
          setContext(d.revisions[0]?.context ?? latest.context);
        } else setContext(d.defaultContext ?? {});
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [endpoint]);
  async function reload() {
    const r = await fetch(endpoint, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setRevisions(d.revisions);
    return d.revisions as Revision[];
  }
  function update(key: keyof FounderContext, value: unknown) {
    setContext((c) => {
      const next = { ...c, [key]: value };
      if (value === "" || value === undefined) delete next[key];
      return next;
    });
  }
  function selectField(
    key: keyof FounderContext,
    label: string,
    options: readonly string[],
  ) {
    return (
      <label className="block text-sm">
        {label}
        <select
          value={String(context[key] ?? "")}
          onChange={(e) => update(key, e.target.value)}
          className="mt-2 w-full rounded border p-3"
        >
          <option value="">Skip / unknown</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  }
  const initial = <ReportView {...props} />;
  return (
    <>
      {available && (
        <div className="no-print panel mb-6">
          <label className="text-sm font-semibold">
            Strategy history
            <select
              aria-label="Strategy history"
              className="ml-4 rounded border p-2"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setDraft(null);
                setEditing(false);
              }}
            >
              <option value="initial">Initial Strategy</option>
              {revisions.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                  disabled={r.status !== "SUCCEEDED"}
                >
                  Refined Strategy v{r.version} · {r.status}
                  {r.approved ? " · APPROVED" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-sm muted">
            Compare any revision with the initial report. Original website facts
            and evidence are preserved.
          </p>
        </div>
      )}
      {strategy && current ? (
        <article className="refined-report">
          <div className="mb-6">
            <p className="eyebrow">
              REFINED STRATEGY · VERSION {current.version}
            </p>
            <h1 className="my-3 text-3xl font-semibold">
              {props.initial.businessName}
            </h1>
            <p className="text-sm muted">
              {current.mock ? "SAMPLE DATA · NOT A LIVE AI RESULT. " : ""}All
              acquisition recommendations are inferred experiments. No external
              market research or prospects were discovered.
            </p>
            <Button
              className="no-print mt-4"
              variant="outline"
              onClick={() => window.print()}
            >
              Print / PDF
            </Button>
          </div>
          {["executiveSummary", "firstMove"].map((k) => (
            <section
              key={k}
              className={`report-section panel ${k === "firstMove" ? "border-teal-300 bg-teal-50" : ""}`}
            >
              <h2>{sectionLabels[k]}</h2>
              <Value
                value={strategy[k as keyof Strategy]}
                editing={editing}
                label={sectionLabels[k]}
                onChange={(value) => setDraft({ ...strategy, [k]: value })}
              />
            </section>
          ))}
          <section className="report-section panel">
            <h2>Founder-confirmed context</h2>
            <p className="mb-3 text-sm muted">
              Provided by the founder, not independently verified. Unanswered
              fields remain unknown. Weekly planning allowance:{" "}
              {weeklyAllowance(current.context)} minutes
              {!current.context.weeklyTime && !current.context.weeklyMinutes
                ? " (assumed)"
                : ""}
              .
            </p>
            <Value
              value={current.context}
              editing={false}
              onChange={() => {}}
            />
          </section>
          {Object.keys(sectionLabels)
            .filter((k) => !["executiveSummary", "firstMove"].includes(k))
            .map((k) => (
              <section key={k} className="report-section panel">
                <h2>{sectionLabels[k]}</h2>
                <Value
                  value={strategy[k as keyof Strategy]}
                  editing={editing}
                  label={sectionLabels[k]}
                  onChange={(value) => setDraft({ ...strategy, [k]: value })}
                />
              </section>
            ))}
          <section className="report-section panel">
            <h2>Product assessment and source evidence</h2>
            <p className="mb-4 text-sm muted">
              Preserved from the initial analysis. Founder context changes
              strategy, not extracted website facts.
            </p>
            {[
              "overview",
              "offerings",
              "problems",
              "valueProposition",
              "differentiators",
              "geographicFocus",
            ].map((k) => (
              <div key={k} className="mb-4">
                <h3 className="font-semibold">
                  {k.replace(/([A-Z])/g, " $1")}
                </h3>
                <Value
                  value={props.initial[k as keyof Report]}
                  editing={false}
                  onChange={() => {}}
                />
              </div>
            ))}
          </section>
          <section className="report-section panel">
            <h2>Assumptions and validation questions</h2>
            <Value
              value={{
                assumptions: strategy.assumptions,
                questions: strategy.validationQuestions,
                originalUnknowns: props.initial.missingInformation,
              }}
              editing={false}
              onChange={() => {}}
            />
          </section>
          {!guest && (
            <div className="panel no-print">
              <Button
                className="mb-4 mr-3"
                variant="outline"
                onClick={() => {
                  setEditing(!editing);
                  setDraft(null);
                }}
              >
                {editing ? "Cancel edits" : "Edit strategy sections"}
              </Button>
              <Button
                disabled={pending || (current.approved && !editing)}
                onClick={async () => {
                  setPending(true);
                  try {
                    const r = await fetch(endpoint, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        revisionId: current.id,
                        ...(editing ? { strategy } : {}),
                      }),
                    });
                    const d = await r.json();
                    if (!r.ok) throw new Error(d.error);
                    await reload();
                    setSelected(d.id);
                    setDraft(null);
                    setEditing(false);
                    setNotice(
                      "Approved strategy saved. Previous versions are preserved.",
                    );
                  } catch (e) {
                    setNotice(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {editing
                  ? "Save edits as a new approved revision"
                  : current.approved
                    ? "Current approved strategy"
                    : "Approve this strategy"}
              </Button>
              <p className="mt-3 text-sm muted">
                Approval records your choice; it does not validate AI
                hypotheses.
              </p>
            </div>
          )}
          <details className="no-print panel mt-6">
            <summary className="cursor-pointer font-semibold">
              Compare with the complete initial strategy
            </summary>
            <div className="mt-6">{initial}</div>
          </details>
        </article>
      ) : (
        <>
          <p className="eyebrow mb-5">INITIAL STRATEGY</p>
          {initial}
        </>
      )}
      {available && (
        <section className="panel no-print mt-8" id="refine-strategy">
          <h2 className="text-2xl font-semibold">
            Make your sales strategy more realistic
          </h2>
          <p className="my-4 text-sm leading-7 muted">
            We’ve analysed your SaaS. Answer a few quick questions so we can
            recommend an acquisition strategy that fits your actual situation.
            All questions are optional. Skip this section to keep your original
            report.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setNotice("");
              try {
                const parsed = founderSchema.safeParse(context);
                if (!parsed.success)
                  throw new Error(parsed.error.issues[0].message);
                const r = await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    context: parsed.data,
                    ...(guest ? { turnstileToken } : {}),
                  }),
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                await reload();
                setSelected(d.id);
                setNotice(
                  "Refined strategy ready. Your original report is preserved.",
                );
              } catch (e) {
                setNotice(e instanceof Error ? e.message : "Refinement failed");
                await reload().catch(() => {});
              } finally {
                setPending(false);
                setTurnstileToken("");
                setReset((n) => n + 1);
              }
            }}
          >
            <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
              {selectField(
                "payingCustomers",
                "How many paying customers do you have?",
                payingOptions,
              )}
              {selectField(
                "weeklyTime",
                "How much time can you spend each week?",
                timeOptions,
              )}
              <label className="text-sm">
                Exact weekly minutes (optional)
                <input
                  type="number"
                  min="1"
                  max="10080"
                  value={context.weeklyMinutes ?? ""}
                  onChange={(e) =>
                    update(
                      "weeklyMinutes",
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                Free or trial users, if known
                <input
                  type="number"
                  min="0"
                  value={context.freeUsers ?? ""}
                  onChange={(e) =>
                    update(
                      "freeUsers",
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                Monthly acquisition budget (zero is valid)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={context.monthlyBudget ?? ""}
                  onChange={(e) =>
                    update(
                      "monthlyBudget",
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                />
              </label>
              {selectField("currency", "Budget currency", [
                "USD",
                "EUR",
                "GBP",
                "ZAR",
                "CAD",
                "AUD",
                "INR",
                "JPY",
                "NZD",
                "CHF",
              ])}
              {selectField(
                "challenge",
                "Your biggest acquisition challenge",
                challengeOptions,
              )}
              {selectField(
                "geographicTarget",
                "Where do you want to find customers?",
                [
                  "My country",
                  "Internationally",
                  "Specific countries or regions",
                ],
              )}
              <label className="text-sm">
                Your country or target regions
                <input
                  maxLength={200}
                  value={context.regions ?? ""}
                  placeholder="Optional — no country is assumed"
                  onChange={(e) => update("regions", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Business stage
                <input
                  maxLength={200}
                  value={context.stage ?? ""}
                  onChange={(e) => update("stage", e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Preferred acquisition approach (optional)
                <input
                  maxLength={500}
                  value={context.preferredApproach ?? ""}
                  onChange={(e) => update("preferredApproach", e.target.value)}
                />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="mb-3 text-sm">
                  Which channels have you already tried?
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {channelOptions.map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        className="!w-auto"
                        type="checkbox"
                        checked={context.channels?.includes(channel) ?? false}
                        onChange={(e) =>
                          update(
                            "channels",
                            channel === "None" && e.target.checked
                              ? ["None"]
                              : e.target.checked
                                ? [
                                    ...(context.channels ?? []).filter(
                                      (x) => x !== "None",
                                    ),
                                    channel,
                                  ]
                                : (context.channels ?? []).filter(
                                    (x) => x !== channel,
                                  ),
                          )
                        }
                      />
                      {channel}
                    </label>
                  ))}
                </div>
              </fieldset>
            </fieldset>
            {guest && (
              <Turnstile onToken={setTurnstileToken} resetKey={reset} />
            )}
            <Button
              className="mt-6"
              type="submit"
              disabled={pending || (guest && !turnstileToken)}
            >
              {pending ? "Refining your strategy…" : "Refine my free strategy"}
            </Button>
            <p className="mt-3 text-xs muted">
              No re-crawl.{" "}
              {guest
                ? "One successful guest refinement; two attempts maximum. Save your report for permanent access."
                : "Each attempt counts toward your free generation quota."}
            </p>
          </form>
        </section>
      )}
      <p role="status" className="no-print my-4 text-sm">
        {notice}
      </p>
    </>
  );
}
