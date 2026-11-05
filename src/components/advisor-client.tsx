"use client";
import { useState } from "react";
import { Check, Clock3, Sparkles, ArrowRight, Compass } from "lucide-react";
import { Button } from "./ui/button";
import type { advisorView } from "@/modules/advisor/service";
import type { FounderContext } from "@/modules/advisor/schema";
type Data = ReturnType<typeof advisorView>;
const channels = [
  "None",
  "Direct outreach",
  "Content/SEO",
  "Paid advertising",
  "Communities/partnerships",
  "Other",
] as const;
const stages = [
  "Pre-launch",
  "Launched, no paying customers",
  "Already have paying customers",
] as const;

export function AdvisorClient({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial);
  const [context, setContext] = useState<FounderContext>(initial.context);
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [help, setHelp] = useState<{
    title: string;
    answer: string;
    cached: boolean;
    fixture: boolean;
  } | null>(null);
  const endpoint = `/api/products/${data.productId}/advisor`;
  async function request(method: string, body: unknown) {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "Could not save. Please try again.");
    return result;
  }
  async function save(generate: boolean) {
    setPending(generate ? "generate" : "save");
    setError("");
    setNotice("");
    try {
      const saved: Data = await request("PATCH", {
        context,
        expectedVersion: data.contextVersion,
      });
      setData(saved);
      setContext(saved.context);
      setNotice("Your answers are saved.");
      if (generate) {
        const generated: Data = await request("POST", {
          kind: "generate",
          expectedVersion: saved.contextVersion,
        });
        setData(generated);
        setNotice("Your plan is saved. You can return to it any time.");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Your request could not be completed.",
      );
    } finally {
      setPending("");
    }
  }
  async function assistance(taskId?: string) {
    const strategy = data.strategy;
    if (!strategy) return;
    setPending(taskId ?? "explain");
    setError("");
    setHelp(null);
    try {
      const result = await request("POST", {
        kind: "assist",
        input: {
          strategyId: strategy.id,
          action: taskId ? "task" : "explain",
          ...(taskId ? { taskId } : {}),
        },
      });
      setHelp({
        title: taskId ? "Help with this task" : "Why this plan",
        ...result,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Help is unavailable right now.",
      );
    } finally {
      setPending("");
    }
  }
  const budget = context.resources.monthlyBudget;
  const s = data.strategy?.output;
  const completed = data.strategy?.tasks.filter((t) => t.completed).length ?? 0;
  const plannedMinutes = s?.tasks.reduce((n, t) => n + t.minutes, 0) ?? 0;
  return (
    <div className="advisor-page">
      <header className="advisor-intro">
        <span className="eyebrow">
          {s ? "YOUR SEVEN-DAY EXPERIMENT" : "A LITTLE CONTEXT, A BETTER PLAN"}
        </span>
        <h1>{s ? data.name : "Make the plan fit your week."}</h1>
        <p className="muted">
          {s
            ? "One focused experiment. Learn from real conversations and product use."
            : "Tell us what you can work with. Every question is optional."}
        </p>
      </header>
      {data.strategy?.fixture && (
        <div className="advisor-fixture" role="note">
          Local fixture data · No live AI call. This plan demonstrates the
          signed-in flow.
        </div>
      )}
      {error && (
        <div className="advisor-error" role="alert">
          {error}
        </div>
      )}
      <p role="status" aria-live="polite" className="advisor-status">
        {pending === "generate"
          ? "Reading product evidence and preparing your plan. Your answers are saved…"
          : pending && pending !== "save"
            ? "Saving progress or preparing help…"
            : notice}
      </p>
      {!s ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(true);
          }}
          className="panel advisor-onboarding"
        >
          <p className="text-sm muted mb-6">
            {data.websiteUrl} · Saved answers are filled in when you return.
          </p>
          <fieldset>
            <legend>
              <span className="advisor-step">1</span> Product stage
            </legend>
            <label htmlFor="advisor-stage" className="sr-only">
              Product stage
            </label>
            <select
              id="advisor-stage"
              value={context.productStage ?? ""}
              onChange={(e) =>
                setContext({
                  ...context,
                  productStage:
                    (e.target.value as FounderContext["productStage"]) || null,
                })
              }
            >
              <option value="">Skip for now</option>
              {stages.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>
              <span className="advisor-step">2</span> Available resources
            </legend>
            <div className="advisor-resources-fields">
              <label htmlFor="advisor-hours">
                Hours per week
                <input
                  id="advisor-hours"
                  type="number"
                  min="0"
                  max="168"
                  step="0.25"
                  placeholder="Optional"
                  value={context.resources.hoursPerWeek ?? ""}
                  onChange={(e) =>
                    setContext({
                      ...context,
                      resources: {
                        ...context.resources,
                        hoursPerWeek:
                          e.target.value === "" ? null : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label htmlFor="advisor-budget">
                Monthly acquisition budget
                <input
                  id="advisor-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={budget?.amount ?? ""}
                  onChange={(e) =>
                    setContext({
                      ...context,
                      resources: {
                        ...context.resources,
                        monthlyBudget:
                          e.target.value === ""
                            ? null
                            : {
                                amount: Number(e.target.value),
                                currency: budget?.currency ?? "USD",
                              },
                      },
                    })
                  }
                />
              </label>
              <label htmlFor="advisor-currency">
                Currency
                <select
                  id="advisor-currency"
                  value={budget?.currency ?? "USD"}
                  onChange={(e) => {
                    if (budget)
                      setContext({
                        ...context,
                        resources: {
                          ...context.resources,
                          monthlyBudget: {
                            ...budget,
                            currency: e.target.value,
                          },
                        },
                      });
                  }}
                  disabled={!budget}
                >
                  {[
                    "USD",
                    "ZAR",
                    "EUR",
                    "GBP",
                    "CAD",
                    "AUD",
                    "INR",
                    "JPY",
                    "NZD",
                    "CHF",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs muted mt-2">
              Zero means no time or budget. Leave blank if you are unsure;
              assumptions will be shown.
            </p>
          </fieldset>
          <fieldset>
            <legend>
              <span className="advisor-step">3</span> Previous acquisition
              efforts
            </legend>
            <div className="advisor-channel-options">
              {channels.map((channel) => (
                <label key={channel}>
                  <input
                    type="checkbox"
                    checked={
                      context.previousEfforts.channels?.includes(channel) ??
                      false
                    }
                    onChange={(e) => {
                      const current = context.previousEfforts.channels ?? [];
                      const next = e.target.checked
                        ? channel === "None"
                          ? (["None"] as typeof current)
                          : [...current.filter((x) => x !== "None"), channel]
                        : current.filter((x) => x !== channel);
                      setContext({
                        ...context,
                        previousEfforts: {
                          channels: next.length ? next : null,
                          other: next.includes("Other")
                            ? context.previousEfforts.other
                            : null,
                        },
                      });
                    }}
                  />
                  {channel}
                </label>
              ))}
            </div>
            {context.previousEfforts.channels?.includes("Other") && (
              <label className="block mt-3" htmlFor="advisor-other">
                What have you tried?
                <input
                  id="advisor-other"
                  maxLength={1000}
                  value={context.previousEfforts.other ?? ""}
                  onChange={(e) =>
                    setContext({
                      ...context,
                      previousEfforts: {
                        ...context.previousEfforts,
                        other: e.target.value || null,
                      },
                    })
                  }
                />
              </label>
            )}
          </fieldset>
          <div className="flex flex-wrap gap-3 mt-7">
            <Button disabled={!!pending} type="submit">
              {pending === "generate"
                ? "Preparing your plan…"
                : "Create my seven-day plan"}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!!pending}
              onClick={() => void save(false)}
            >
              Save answers for later
            </Button>
          </div>
        </form>
      ) : (
        <>
          <section
            className="advisor-strategy-grid"
            aria-label="Current strategy"
          >
            <article className="panel">
              <div className="advisor-card-label">
                <Compass size={17} aria-hidden="true" />
                START WITH THIS BUYER
              </div>
              <h2>{s.buyer.segment}</h2>
              <p>{s.buyer.buyingProblemOrTrigger}</p>
              <details>
                <summary>Why this buyer</summary>
                <p>{s.buyer.whyChosen}</p>
              </details>
            </article>
            <article className="panel">
              <div className="advisor-card-label">
                <ArrowRight size={17} aria-hidden="true" />
                FIND THEM HERE
              </div>
              <h2>{s.channel.name}</h2>
              <p>{s.channel.whereAndHow}</p>
              <details>
                <summary>Why this channel</summary>
                <p>{s.channel.whyChosen}</p>
              </details>
            </article>
          </section>
          <section className="panel advisor-access">
            <h2>Check access before investing more time</h2>
            <p>{s.channel.accessCheck}</p>
            <details>
              <summary>If that route is unavailable</summary>
              <p>{s.channel.fallback}</p>
              <p className="text-xs muted">
                A conditional option to evaluate. Your saved strategy stays
                unchanged.
              </p>
            </details>
          </section>
          <section className="panel advisor-plan">
            <div className="advisor-plan-heading">
              <div>
                <span className="eyebrow">THIS WEEK</span>
                <h2>Your next seven days</h2>
              </div>
              <span className="advisor-completion">
                <Check size={15} aria-hidden="true" />
                {completed} of {s.tasks.length} complete
              </span>
            </div>
            <p className="advisor-time">
              <Clock3 size={15} aria-hidden="true" />
              {plannedMinutes} minutes planned ·{" "}
              {s.resources.availableMinutes - plannedMinutes} minutes kept free
              · {s.resources.currency}{" "}
              {s.tasks.reduce((n, t) => n + t.directCost, 0)} direct spend
            </p>
            <div className="advisor-tasks">
              {s.tasks.map((task, index) => {
                const state = data.strategy!.tasks[index];
                return (
                  <article
                    key={state.id}
                    className={`advisor-task ${state.completed ? "is-complete" : ""}`}
                  >
                    <div className="advisor-task-top">
                      <input
                        type="checkbox"
                        aria-label={`Complete: ${task.title}`}
                        checked={state.completed}
                        disabled={!!pending}
                        onChange={async (e) => {
                          const next = e.target.checked;
                          setPending(state.id);
                          setError("");
                          setData((current) => ({
                            ...current,
                            strategy: current.strategy
                              ? {
                                  ...current.strategy,
                                  tasks: current.strategy.tasks.map((t) =>
                                    t.id === state.id
                                      ? { ...t, completed: next }
                                      : t,
                                  ),
                                }
                              : null,
                          }));
                          try {
                            const saved = await request("POST", {
                              kind: "task",
                              taskId: state.id,
                              completed: next,
                              expectedVersion: state.version,
                            });
                            setData((current) => ({
                              ...current,
                              strategy: current.strategy
                                ? {
                                    ...current.strategy,
                                    tasks: current.strategy.tasks.map((t) =>
                                      t.id === state.id
                                        ? {
                                            ...t,
                                            completed: saved.completed,
                                            version: saved.version,
                                          }
                                        : t,
                                    ),
                                  }
                                : null,
                            }));
                            setNotice("Progress saved.");
                          } catch (error) {
                            setData((current) => ({
                              ...current,
                              strategy: current.strategy
                                ? {
                                    ...current.strategy,
                                    tasks: current.strategy.tasks.map((t) =>
                                      t.id === state.id ? state : t,
                                    ),
                                  }
                                : null,
                            }));
                            setError(
                              error instanceof Error
                                ? error.message
                                : "Could not save progress.",
                            );
                          } finally {
                            setPending("");
                          }
                        }}
                      />
                      <div>
                        <h3>{task.title}</h3>
                        <span className="text-xs muted">
                          {task.minutes} minutes
                        </span>
                      </div>
                    </div>
                    <details>
                      <summary>Task instructions</summary>
                      <p>{task.instruction}</p>
                      <p className="text-sm muted">
                        {task.activityToRecord.replace(/^Record:\s*/i, "")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!!pending}
                        onClick={() => void assistance(state.id)}
                      >
                        <Sparkles size={15} aria-hidden="true" />
                        Help me with this task
                      </Button>
                    </details>
                  </article>
                );
              })}
            </div>
            <p className="text-xs muted mt-4">
              Checkboxes track activities. Replies, trials and paying customers
              are separate outcomes.
            </p>
          </section>
          <section className="panel advisor-learning">
            <h2>What would make this worth continuing?</h2>
            <p>{s.successCriteria.continueWhen}</p>
            <details>
              <summary>Evidence, adjustments & important unknowns</summary>
              <p>
                <strong>Collect:</strong> {s.successCriteria.evidenceToCollect}
              </p>
              <p>
                <strong>Adjust:</strong> {s.successCriteria.adjustWhen}
              </p>
              <p>
                <strong>Reconsider:</strong> {s.successCriteria.reconsiderWhen}
              </p>
              <ul className="list-disc pl-5 mt-3">
                {s.importantUnknowns.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
              <p className="text-xs muted mt-3">{s.resources.basis}</p>
            </details>
          </section>
          <div className="advisor-help-trigger">
            <Button
              type="button"
              variant="outline"
              disabled={!!pending}
              onClick={() => void assistance()}
            >
              <Sparkles size={16} aria-hidden="true" />
              Explain this recommendation
            </Button>
            <span className="text-xs muted">
              Ask when you need it. Your saved plan stays in place.
            </span>
          </div>
          {help && (
            <section
              className="panel advisor-answer"
              aria-label="Advisor response"
            >
              <div className="flex justify-between gap-3">
                <h2>{help.title}</h2>
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() => setHelp(null)}
                >
                  Close
                </button>
              </div>
              <p className="text-xs muted mt-2">
                {help.fixture
                  ? "Local AI transport fixture"
                  : help.cached
                    ? "Saved AI response"
                    : "AI-generated explanation"}{" "}
                · Strategy v{data.strategy!.version}
              </p>
              <p className="whitespace-pre-wrap mt-4">{help.answer}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
