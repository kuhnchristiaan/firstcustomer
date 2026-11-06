"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import type { weeklyHistory } from "@/modules/advisor/weekly-service";
import type { AdvisorStrategy } from "@/modules/advisor/schema";
import type { WeeklyResults } from "@/modules/advisor/weekly-schema";
import { weeklyDecisionLabel } from "@/modules/advisor/weekly-presentation";
type History = Awaited<ReturnType<typeof weeklyHistory>>;
type Proposal = {
  decision: "Continue" | "Adjust" | "Reconsider";
  evidenceAssessment: string;
  remainingUncertainty: string;
  changeReason: string;
  proposedPlan: AdvisorStrategy;
};
const metrics = [
  ["prospectsContacted", "Prospects contacted"],
  ["replies", "Replies"],
  ["qualifiedConversations", "Qualified conversations"],
  ["activations", "Trials or product activations"],
  ["payingCustomers", "Paying customers acquired"],
] as const;
export function AdvisorWeekly({
  productId,
  planId,
  tasks,
  current,
  onResultsSaved,
}: {
  productId: string;
  planId: string;
  tasks: { id: string; position: number; completed: boolean }[];
  current: AdvisorStrategy;
  onResultsSaved: () => Promise<void>;
}) {
  const [history, setHistory] = useState<History | null>(null);
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [completionOverrides, setCompletionOverrides] = useState<
    Record<string, boolean>
  >({});
  const completed = tasks
    .filter((t) => completionOverrides[t.id] ?? t.completed)
    .map((t) => t.id);
  const [feedback, setFeedback] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const endpoint = `/api/products/${productId}/advisor/weekly`;
  async function load() {
    const response = await fetch(endpoint, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setHistory(data);
  }
  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (active) setHistory(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);
  async function mutate(body: unknown) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }
  const review = history?.reviews.find((r) => r.planId === planId);
  const proposal = review?.proposal as Proposal | null | undefined;
  const material =
    proposal &&
    (proposal.proposedPlan.buyer.segment !== current.buyer.segment ||
      proposal.proposedPlan.channel.name !== current.channel.name);
  return (
    <section className="advisor-weekly" aria-label="Weekly results and review">
      <div className="panel advisor-learning">
        <span className="eyebrow">CLOSE THE LEARNING LOOP</span>
        <h2>What happened this week?</h2>
        <p className="text-sm muted mt-3">
          Record what actually happened, even if little got done. Blank means
          unknown; enter 0 for a known zero. Checked tasks do not imply
          customers or revenue.
        </p>
        {error && (
          <p role="alert" className="advisor-error mt-3">
            {error}
          </p>
        )}
        {pending && (
          <p role="status" className="mt-3 text-sm">
            {pending === "review"
              ? "Reviewing the evidence. Your current plan stays active…"
              : "Saving…"}
          </p>
        )}
        {!history && !error && (
          <p className="text-sm mt-3">Loading saved results…</p>
        )}
        {history && !review && (
          <details className="advisor-weekly-entry">
            <summary>Record this week’s results</summary>
            <form
              className="mt-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setPending("results");
                setError("");
                try {
                  const values = Object.fromEntries(
                    metrics.map(([name]) => [
                      name,
                      numbers[name]?.trim() ? Number(numbers[name]) : null,
                    ]),
                  );
                  await mutate({
                    kind: "results",
                    results: {
                      planId,
                      submissionKey: key,
                      ...values,
                      feedback,
                      completedTaskIds: completed,
                    } as WeeklyResults,
                  });
                  await load();
                  await onResultsSaved();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not save results.",
                  );
                } finally {
                  setPending("");
                }
              }}
            >
              <div className="advisor-results-grid">
                {metrics.map(([name, label]) => (
                  <label key={name} htmlFor={`weekly-${name}`}>
                    {label}
                    <input
                      id={`weekly-${name}`}
                      type="number"
                      min="0"
                      max="100000000"
                      step="1"
                      placeholder="Unknown"
                      value={numbers[name] ?? ""}
                      onChange={(e) =>
                        setNumbers({ ...numbers, [name]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="block mt-4" htmlFor="weekly-feedback">
                Obstacles, objections and feedback
                <textarea
                  id="weekly-feedback"
                  rows={4}
                  maxLength={12000}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did people say? What prevented progress?"
                />
              </label>
              <fieldset className="mt-5">
                <legend className="font-semibold text-sm">
                  Tasks you actually completed
                </legend>
                <p className="text-xs muted mt-1">
                  Confirm or correct this snapshot before saving the week.
                </p>
                {tasks.map((t) => (
                  <label className="advisor-confirm-task" key={t.id}>
                    <input
                      type="checkbox"
                      checked={completed.includes(t.id)}
                      onChange={(e) =>
                        setCompletionOverrides({
                          ...completionOverrides,
                          [t.id]: e.target.checked,
                        })
                      }
                    />
                    {current.tasks[t.position].title}
                  </label>
                ))}
              </fieldset>
              <Button className="mt-5" disabled={!!pending}>
                Save weekly results
              </Button>
            </form>
          </details>
        )}
        {review && (
          <div className="mt-5">
            <p className="font-semibold">Results saved</p>
            <div className="advisor-results-summary">
              {metrics.map(([name, label]) => (
                <span key={name}>
                  {label}:{" "}
                  <strong>
                    {(review.results as Record<string, unknown>)[name] === null
                      ? "Unknown"
                      : String(
                          (review.results as Record<string, unknown>)[name],
                        )}
                  </strong>
                </span>
              ))}
            </div>
            <p className="text-sm mt-3 whitespace-pre-wrap">
              {String(
                (review.results as Record<string, unknown>).feedback ||
                  "No qualitative feedback recorded.",
              )}
            </p>
            {!proposal && review.status !== "FAILED" && (
              <Button
                className="mt-4"
                disabled={!!pending}
                onClick={async () => {
                  setPending("review");
                  setError("");
                  try {
                    await mutate({ kind: "review", reviewId: review.id });
                    await load();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Review unavailable.",
                    );
                    await load();
                  } finally {
                    setPending("");
                  }
                }}
              >
                Review my results
              </Button>
            )}
            {review.status === "FAILED" && (
              <p className="mt-3 text-sm">
                This review attempt failed. Your results and current plan are
                preserved; no proposal was applied.
              </p>
            )}
          </div>
        )}
      </div>
      {proposal && review?.status === "PROPOSED" && (
        <section
          className="panel advisor-learning"
          aria-label="Proposed next plan"
        >
          <span className="eyebrow">PROPOSAL · NOT APPLIED</span>
          <h2>
            {weeklyDecisionLabel(
              proposal.decision,
              current,
              proposal.proposedPlan,
            )}
            : your next seven days
          </h2>
          <p className="mt-3">{proposal.evidenceAssessment}</p>
          <p className="mt-3 text-sm">
            <strong>Still uncertain:</strong> {proposal.remainingUncertainty}
          </p>
          <p className="mt-3 text-sm">
            <strong>Why these changes:</strong> {proposal.changeReason}
          </p>
          {review.fixture && (
            <p className="advisor-fixture mt-3">
              Local AI transport fixture · No live model call.
            </p>
          )}
          {material && (
            <div className="advisor-error mt-4">
              <strong>Material strategy change proposed</strong>
              <p className="mt-2">
                Buyer: {current.buyer.segment} →{" "}
                {proposal.proposedPlan.buyer.segment}
              </p>
              <p className="mt-2">
                Channel: {current.channel.name} →{" "}
                {proposal.proposedPlan.channel.name}
              </p>
            </div>
          )}
          <ol className="list-decimal pl-5 mt-4">
            {proposal.proposedPlan.tasks.map((t, i) => (
              <li key={i} className="mb-4">
                <strong>{t.title}</strong> · {t.minutes} minutes
                <p className="text-sm mt-1">{t.instruction}</p>
                <p className="text-xs muted mt-1">{t.activityToRecord}</p>
              </li>
            ))}
          </ol>
          <details>
            <summary>Full proposed strategy and success criteria</summary>
            <p>{proposal.proposedPlan.buyer.segment}</p>
            <p>{proposal.proposedPlan.buyer.buyingProblemOrTrigger}</p>
            <p>{proposal.proposedPlan.buyer.whyChosen}</p>
            <p>{proposal.proposedPlan.channel.name}</p>
            <p>{proposal.proposedPlan.channel.whyChosen}</p>
            <p>{proposal.proposedPlan.channel.whereAndHow}</p>
            <p>{proposal.proposedPlan.channel.accessCheck}</p>
            <p>{proposal.proposedPlan.channel.fallback}</p>
            {Object.entries(proposal.proposedPlan.successCriteria).map(
              ([k, v]) => (
                <p key={k}>{v}</p>
              ),
            )}
            <p>{proposal.proposedPlan.resources.basis}</p>
          </details>
          {material && (
            <label className="advisor-confirm-task mt-4">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              I approve the proposed buyer or acquisition channel change.
            </label>
          )}
          <Button
            className="mt-4"
            disabled={!!pending || (!!material && !confirm)}
            onClick={async () => {
              setPending("accept");
              setError("");
              try {
                await mutate({
                  kind: "accept",
                  reviewId: review.id,
                  expectedPlanId: planId,
                  confirmMaterialChange: confirm,
                });
                window.location.reload();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not approve this plan.",
                );
                setPending("");
              }
            }}
          >
            Approve and start next plan
          </Button>
          <p className="text-xs muted mt-3">
            Your current plan remains active until you approve. Earlier plans
            and results stay in history.
          </p>
        </section>
      )}
      {history && (
        <section
          className="panel advisor-learning"
          aria-label="Advisor history"
        >
          <h2>Plans, results & decisions</h2>
          {history.plans.map((plan) => {
            const r = history.reviews.find(
              (review) => review.planId === plan.id,
            );
            const p = r?.proposal as Proposal | null | undefined;
            const output = plan.output as unknown as AdvisorStrategy;
            return (
              <details key={plan.id}>
                <summary>
                  Plan {plan.version} · Strategy v{plan.strategyVersion}
                  {plan.id === history.currentPlanId ? " · Current" : ""}
                </summary>
                <p>{output.buyer.segment}</p>
                <p>{output.buyer.buyingProblemOrTrigger}</p>
                <p>{output.buyer.whyChosen}</p>
                <p>{output.channel.name}</p>
                <p>{output.channel.whereAndHow}</p>
                <p>{output.channel.whyChosen}</p>
                <p>{output.channel.accessCheck}</p>
                <p>{output.channel.fallback}</p>
                {Object.entries(output.successCriteria).map(([key, value]) => (
                  <p key={key}>{value}</p>
                ))}
                <p>{output.resources.basis}</p>
                <ul>
                  {output.importantUnknowns.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
                <ol className="list-decimal pl-5">
                  {output.tasks.map((t, i) => (
                    <li key={i}>
                      {t.title} —{" "}
                      {plan.tasks[i]?.completed ? "Completed" : "Not completed"}
                      <p>{t.instruction}</p>
                    </li>
                  ))}
                </ol>
                {r && (
                  <>
                    <p>
                      <strong>Recorded results</strong>
                    </p>
                    {metrics.map(([name, label]) => (
                      <p key={name}>
                        {label}:{" "}
                        {(r.results as Record<string, unknown>)[name] === null
                          ? "Unknown"
                          : String(
                              (r.results as Record<string, unknown>)[name],
                            )}
                      </p>
                    ))}
                    <p>
                      {String((r.results as Record<string, unknown>).feedback)}
                    </p>
                    {p && (
                      <>
                        <p>
                          <strong>
                            {weeklyDecisionLabel(
                              p.decision,
                              output,
                              p.proposedPlan,
                            )}
                          </strong>{" "}
                          ·{" "}
                          {r.status === "ACCEPTED" ? "Accepted" : "Not applied"}
                        </p>
                        <p>{p.evidenceAssessment}</p>
                        <p>{p.remainingUncertainty}</p>
                        <p>{p.changeReason}</p>
                      </>
                    )}
                  </>
                )}
              </details>
            );
          })}
        </section>
      )}
    </section>
  );
}
