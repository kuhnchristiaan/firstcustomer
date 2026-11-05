import { describe, expect, it, vi } from "vitest";
import { advisorConfig } from "@/modules/advisor/config";
import {
  contextSchema,
  emptyContext,
  advisorSchema,
  checkResources,
} from "@/modules/advisor/schema";
import { readFileSync } from "node:fs";
describe("signed-in advisor resource and configuration boundaries", () => {
  it("accepts all-skipped answers and preserves zero instead of replacing it with an assumption", () => {
    expect(contextSchema.parse(emptyContext)).toEqual(emptyContext);
    expect(
      contextSchema.parse({
        ...emptyContext,
        resources: {
          hoursPerWeek: 0,
          monthlyBudget: { amount: 0, currency: "ZAR" },
        },
      }).resources.hoursPerWeek,
    ).toBe(0);
    expect(
      contextSchema.safeParse({
        ...emptyContext,
        previousEfforts: { channels: ["None", "Direct outreach"], other: null },
      }).success,
    ).toBe(false);
  });
  it("requires headroom without truncating or repairing the strategy", () => {
    const original = JSON.parse(
      readFileSync(
        "docs/strategy-intelligence-proof/run-1/senja-output.txt",
        "utf8",
      ),
    );
    const s = advisorSchema(["s1", "s2", "s3", "s4"]).parse({
      ...original,
      schemaVersion: "advisor/1",
      channel: {
        ...original.channel,
        accessCheck: "Verify suitable buyers and permitted contact.",
        fallback: "Check a public business inquiry route for the same buyers.",
      },
      tasks: original.tasks.map((t: object, i: number) => ({
        ...t,
        title: `Task ${i + 1}`,
      })),
    });
    const context = contextSchema.parse({
      ...emptyContext,
      resources: {
        hoursPerWeek: 3,
        monthlyBudget: { amount: 0, currency: "USD" },
      },
    });
    expect(() => checkResources(s, context)).toThrow(/headroom/);
    const snapshot = JSON.stringify(s);
    expect(s.tasks.reduce((n, t) => n + t.minutes, 0)).toBe(180);
    expect(JSON.stringify(s)).toBe(snapshot);
    s.tasks.forEach((t) => {
      t.minutes = 28;
    });
    expect(() => checkResources(s, context)).not.toThrow();
  });
  it("rejects fixture mode in production and on remote databases; isolates strategy model settings", () => {
    vi.stubEnv("ADVISOR_ENABLED", "true");
    vi.stubEnv("ADVISOR_FIXTURES", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://test@127.0.0.1:55441/firstcustomers_advisor_dev",
    );
    vi.stubEnv("APP_URL", "http://localhost:3100");
    expect(() => advisorConfig()).toThrow(/dedicated local/);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://test@remote.invalid:55441/firstcustomers_advisor_dev",
    );
    expect(() => advisorConfig()).toThrow(/dedicated local/);
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://test@127.0.0.1:55441/firstcustomers_advisor_dev",
    );
    vi.stubEnv("OPENAI_MODEL", "unchanged-production-model");
    expect(advisorConfig().ADVISOR_STRATEGY_MODEL).toBe("gpt-6.1-sol");
    expect(process.env.OPENAI_MODEL).toBe("unchanged-production-model");
    expect(() => advisorConfig().rates("unpriced-model")).toThrow(/pricing/);
    vi.unstubAllEnvs();
  });
});
