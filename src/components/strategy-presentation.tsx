import type { ReactNode } from "react";
import type { Strategy } from "@/modules/strategy/schema";
import type { Report } from "@/modules/intelligence/schema";

type Render = (value: unknown) => ReactNode;
export function presentStrategyValue(
  value: unknown,
  render: Render,
): ReactNode | null {
  if (!value || typeof value !== "object") return null;
  if (
    !Array.isArray(value) &&
    "segment" in value &&
    "message" in value &&
    "continueWhen" in value
  ) {
    const m = value as Strategy["firstMove"];
    return (
      <div className="first-move-content">
        <h3 className="first-move-target">{m.segment}</h3>
        <p className="mt-3">{m.why}</p>
        <div className="first-move-detail">
          <div>
            <h3>First experiment · {m.minutes} minutes</h3>
            <p>{m.action}</p>
          </div>
          <div>
            <h3>Where to start</h3>
            <p>{m.where}</p>
          </div>
          <div>
            <h3>A conversation starter</h3>
            <p className="whitespace-pre-wrap">
              {m.message.replace(/\\n/g, "\n")}
            </p>
          </div>
          <div>
            <h3>Your decision rule</h3>
            <p>Continue: {m.continueWhen}</p>
            <p className="mt-2">Change course: {m.changeWhen}</p>
          </div>
        </div>
        <p className="mt-5 text-xs muted">
          Replace placeholders and verify personalisation before sending.
        </p>
      </div>
    );
  }
  if (
    !Array.isArray(value) ||
    !value.length ||
    !value.every((v) => v && typeof v === "object")
  )
    return null;
  if (value.every((v) => "weeklyMinutes" in v && "monthlyDirectCost" in v)) {
    return (
      <div>
        {(value as Strategy["channels"]).map((c) => (
          <article key={c.priority} className="experiment-entry">
            <div className="segment-heading">
              <span className="priority-number">{c.priority}</span>
              <div>
                <h3>{c.name}</h3>
                <p className="segment-meta">
                  {c.segment} · {c.weeklyMinutes} min/week · {c.costCurrency}{" "}
                  {c.monthlyDirectCost} direct cost/month
                </p>
              </div>
            </div>
            <p className="text-sm leading-7">{c.rationale}</p>
            <div className="experiment-result">
              <strong>First action:</strong> {c.firstAction}
            </div>
            <details>
              <summary>Timing, risks and evidence</summary>
              <p className="text-sm leading-7">{c.timeHorizonAssumption}</p>
              <p className="text-sm leading-7">{c.risks}</p>
              <p className="mt-2 text-xs muted">{c.evidenceLevel}</p>
            </details>
          </article>
        ))}
      </div>
    );
  }
  if (
    value.every((v) => "steps" in v && "recommendation" in v && "title" in v)
  ) {
    return (
      <div>
        {(value as Report["acquisitionChannels"]).map((c, i) => (
          <article key={i} className="experiment-entry">
            <div className="segment-heading">
              <span className="priority-number">{i + 1}</span>
              <h3>{c.title}</h3>
            </div>
            {render(c.recommendation)}
            <ol>
              {c.steps.map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ol>
            <p className="experiment-result">
              <strong>Review the result:</strong> {c.successMetric}
            </p>
          </article>
        ))}
      </div>
    );
  }
  if (
    value.every((v) => "week" in v && "nextDecision" in v && "actions" in v)
  ) {
    return (
      <div className="weekly-plan">
        {(value as Strategy["weeks"]).map((w) => (
          <article key={w.week} className="week-entry">
            <span className="week-number">Week {w.week}</span>
            <div>
              <h3>
                {w.objective}
                <span className="week-effort">
                  {w.actions.reduce((n, a) => n + a.minutes, 0)} minutes total
                </span>
              </h3>
              <ul>
                {w.actions.map((a, i) => (
                  <li key={i}>
                    {a.action}
                    <span className="task-time">{a.minutes} min</span>
                  </li>
                ))}
              </ul>
              <p className="week-decision">
                <strong>Deliverable:</strong> {w.deliverable}
              </p>
              <p className="week-decision">
                <strong>Measure:</strong> {w.successMetric}
              </p>
              <p className="week-decision">
                <strong>Next decision:</strong> {w.nextDecision}
              </p>
            </div>
          </article>
        ))}
      </div>
    );
  }
  if (value.every((v) => "name" in v && "priority" in v && "rationale" in v)) {
    return (
      <div className="segment-list">
        {(value as Strategy["prioritizedSegments"]).map((s) => (
          <article key={s.priority} className="segment-entry">
            <div className="segment-heading">
              <span className="priority-number">{s.priority}</span>
              <div>
                <h3>{s.name}</h3>
                <p className="mt-2 text-sm leading-7 muted">{s.rationale}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }
  if (value.every((v) => "researchMinutes" in v && "week" in v)) {
    return (
      <div className="effort-list">
        {(
          value as {
            week: number;
            researchMinutes: number;
            preparationMinutes: number;
            outreachMinutes: number;
            replyMinutes: number;
            followUpMinutes: number;
            uncertainty: string;
          }[]
        ).map((w) => (
          <div key={w.week} className="detail-group">
            <h3 className="reading-label">
              Week {w.week} · effort within the planned tasks
            </h3>
            <p className="text-sm leading-7">
              Research {w.researchMinutes} min · Preparation{" "}
              {w.preparationMinutes} min · Outreach {w.outreachMinutes} min ·
              Replies {w.replyMinutes} min · Follow-up {w.followUpMinutes} min
            </p>
            <p className="mt-2 text-xs muted">{w.uncertainty}</p>
          </div>
        ))}
      </div>
    );
  }
  if (
    value.every((v) => "identifySuitableProspects" in v && "abandonWhen" in v)
  ) {
    return (
      <div>
        {(
          value as {
            channel: string;
            segment: string;
            where: string;
            identifySuitableProspects: string;
            action: string;
            positiveResult: string;
            continueWhen: string;
            changeWhen: string;
            abandonWhen: string;
          }[]
        ).map((e, i) => (
          <article key={i} className="experiment-entry">
            <h3>{e.channel}</h3>
            <p className="segment-meta">{e.segment}</p>
            <div className="definition-grid">
              {[
                ["Where", e.where],
                ["Who qualifies", e.identifySuitableProspects],
                ["What to do", e.action],
                ["Positive result", e.positiveResult],
                ["Continue when", e.continueWhen],
                ["Change when", e.changeWhen],
                ["Stop when", e.abandonWhen],
              ].map(([label, text]) => (
                <div key={label}>
                  <h4 className="reading-label">{label}</h4>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    );
  }
  return null;
}
