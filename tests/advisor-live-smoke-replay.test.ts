import { it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { advisorSchema, contextSchema, checkResources } from "@/modules/advisor/schema";
import { validateProductProfile } from "@/modules/intelligence/product-profile";
const root = "docs/stage-2b-live-smoke";
const read = (name: string) => JSON.parse(readFileSync(`${root}/${name}`, "utf8"));
it.skipIf(!existsSync(`${root}/database-evidence.json`))("replays the recorded genuine live strategy and provenance without any new model call", () => {
  const db = read("database-evidence.json");
  const profile = validateProductProfile(db.workspace.profile, db.workspace.sources);
  const ids = profile.statements.map((s) => s.id) as [string, ...string[]];
  const raw = read("2-advisor_strategy-output.txt");
  const strategy = advisorSchema(ids).parse(raw);
  const founder = contextSchema.parse(db.workspace.founderContext);
  checkResources(strategy, founder);
  expect(strategy).toEqual(db.strategy.output);
  expect(db.strategy.fixture).toBe(false);
  expect(db.tasks[0].completed).toBe(true);
  expect(strategy.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(150);
  const verification = read("browser-verification.json");
  expect(verification).toMatchObject({ realAi: true, fixtureAiCalls: 0, savedStrategySurvivedRefresh: true, completedTaskSurvivedRefresh: true, explanationDidNotChangeStrategy: true, nextActionAdvanced: true });
  const cost = read("cost-summary.json");
  expect(cost.calls).toBe(3);
  expect(cost.usageBasedEstimatedCostUsd).toBeLessThanOrEqual(0.40);
  expect(cost.errors).toEqual([]);
  for (const stage of ["1-advisor_product_identification", "2-advisor_strategy", "3-advisor_assistance"]) {
    const response = read(`${stage}-response.json`);
    expect(response.status).toBe("completed");
    const text = response.output.flatMap((item: { content?: { type: string; text?: string }[] }) => (item.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "")).join("");
    expect(text).toBe(readFileSync(`${root}/${stage}-output.txt`, "utf8"));
  }
});
