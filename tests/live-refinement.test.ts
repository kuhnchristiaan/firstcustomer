import { it, expect } from "vitest";
import { config as loadEnv } from "dotenv";
import { refineStrategy } from "@/modules/strategy/provider";
import { mockReport } from "@/modules/analysis/mock";
import { validateStrategy } from "@/modules/strategy/schema";
import { guestConfig } from "@/modules/guest/config";
// Explicit opt-in: one bounded paid API call, no website or database access.
it.skipIf(process.env.LIVE_REFINEMENT_TEST !== "true")(
  "validates one real AI refinement within the zero-budget founder allowance",
  async () => {
    loadEnv({ path: ".env.local", quiet: true });
    const limits = guestConfig();
    const context = {
      payingCustomers: "0" as const,
      weeklyTime: "Less than 1 hour" as const,
      monthlyBudget: 0,
      currency: "USD" as const,
    };
    const original = JSON.stringify(mockReport);
    const result = await refineStrategy(mockReport, context, [], null, {
      input: Math.min(30000, limits.GUEST_MAX_INPUT_TOKENS),
      output: Math.min(4500, limits.GUEST_MAX_OUTPUT_TOKENS),
    });
    expect(validateStrategy(result.strategy, context).schemaVersion).toBe(
      "2.0",
    );
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(JSON.stringify(mockReport)).toBe(original);
    console.log(
      `Validated real refinement: ${result.inputTokens} input tokens, ${result.outputTokens} output tokens. No crawl; facts unchanged.`,
    );
  },
  65000,
);
