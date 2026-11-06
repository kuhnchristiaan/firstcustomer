import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { compactAdvisorSchema, founderContextSchema, proofPolicy, requestReservation, strategyRequest } from "@/modules/advisor-proof/contract";
import { evaluationHtml, strategyMarkdown, strategyObservations } from "@/modules/advisor-proof/presentation";

// Hand-authored transport fixture ONLY; never saved as a genuine strategy.
function fixture() {
  return compactAdvisorSchema(["s1"]).parse({
    schemaVersion: "advisor-proof/1",
    buyer: { segment: "A test buyer", buyingProblemOrTrigger: "A test buying trigger.", whyChosen: "A complete test rationale. ".repeat(40) },
    channel: { name: "A test channel", whereAndHow: "A concrete place and method.", whyChosen: "A complete channel rationale." },
    tasks: Array.from({ length: 3 }, (_, i) => ({ instruction: `Test instruction ${i + 1}.`, activityToRecord: "An activity, not a customer result.", minutes: 30, directCost: 0 })),
    resources: { availableMinutes: 180, experimentBudget: 0, currency: "USD", basis: "A hypothetical test budget." },
    successCriteria: { evidenceToCollect: "Record actual observations.", continueWhen: "A test continue condition.", adjustWhen: "A test adjust condition.", reconsiderWhen: "A test reconsider condition." },
    importantUnknowns: ["A test unknown."], productEvidenceIds: ["s1"],
  });
}
const skipped = { productStage: null, resources: { hoursPerWeek: null, monthlyBudget: null }, previousEfforts: { channels: null, other: null } };

describe("isolated compact advisor proof", () => {
  it("preserves long complete reasoning and every task instead of truncating to a field cap", () => {
    const s = fixture();
    const rendered = strategyMarkdown(s);
    expect(rendered).toContain(s.buyer.whyChosen);
    s.tasks.forEach((t) => expect(rendered).toContain(t.instruction));
    expect(rendered).toContain(s.successCriteria.reconsiderWhen);
    expect(JSON.stringify(zodTextFormat(compactAdvisorSchema(["s1"]), "proof"))).not.toContain("maxLength");
  });
  it("accepts skipped groups and zero resources without coercing them into founder facts", () => {
    expect(founderContextSchema.parse(skipped)).toEqual(skipped);
    const zero = { ...skipped, resources: { hoursPerWeek: 0, monthlyBudget: { amount: 0, currency: "ZAR" } } };
    const request = strategyRequest({ product: { name: "Fixture" }, statementIds: ["s1"], founderContext: zero });
    expect(JSON.stringify(request)).toContain('"hoursPerWeek\\":0');
    expect(founderContextSchema.safeParse({ ...skipped, resources: { hoursPerWeek: -1, monthlyBudget: null } }).success).toBe(false);
  });
  it("binds output references to saved evidence and keeps the contract independent of nine-section reports", () => {
    const s = fixture();
    expect(compactAdvisorSchema(["other"]).safeParse(s).success).toBe(false);
    expect(compactAdvisorSchema(["s1"]).safeParse({ ...s, tasks: s.tasks.slice(0, 2) }).success).toBe(false);
    expect(compactAdvisorSchema(["s1"]).safeParse({ ...s, thirtyDayPlan: [] }).success).toBe(false);
  });
  it("reports budget/reading observations without hiding or rewriting failed candidates", () => {
    const s = fixture();
    s.tasks[0].minutes = 200;
    const before = JSON.stringify(s);
    expect(strategyObservations(s)).toMatchObject({ plannedMinutes: 260, withinStatedResources: false });
    expect(JSON.stringify(s)).toBe(before);
    expect(strategyMarkdown(s)).toContain("200 minutes");
  });
  it("renders returned text safely and in full in the standalone review page", () => {
    const output = '<script>alert("test")</script>\n' + "complete text ".repeat(400);
    const html = evaluationHtml([{ name: "test", context: skipped, output, metadata: {} }]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("complete text ".repeat(400));
  });
  it("reserves reasoning output and worst-case input costs without relying on cache discounts", () => {
    const request = strategyRequest({ product: { name: "Fixture" }, statementIds: ["s1"], founderContext: skipped });
    const reservation = requestReservation(request);
    expect(reservation.reservedUsd).toBeGreaterThan(proofPolicy.maxOutputTokens * proofPolicy.ratesPerMillion.output / 1e6);
    expect(reservation.reservedUsd * proofPolicy.maxCalls).toBeLessThanOrEqual(proofPolicy.ceilingUsd);
    expect(request).toMatchObject({ model: "gpt-6.1-sol", reasoning: { effort: "medium" }, store: false, service_tier: "default" });
  });
});
