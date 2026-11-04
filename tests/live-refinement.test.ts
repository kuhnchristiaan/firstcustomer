import { it, expect } from "vitest";
import { config as loadEnv } from "dotenv";
import { refineStrategy } from "@/modules/strategy/provider";
import { mockReport } from "@/modules/analysis/mock";
import { validateStrategy } from "@/modules/strategy/schema";
import { guestConfig } from "@/modules/guest/config";
import { config } from "@/modules/config/env";
// Explicit opt-in: two bounded paid API calls, no website or database access.
it.skipIf(process.env.LIVE_REFINEMENT_TEST !== "true")(
  "validates one real AI refinement within the zero-budget founder allowance",
  async () => {
    loadEnv({ path: ".env.local", quiet: true });
    const limits = guestConfig();
    const settings = config();
    expect(
      (settings.REFINEMENT_MAX_INPUT_TOKENS *
        limits.GUEST_INPUT_USD_PER_MILLION +
        settings.REFINEMENT_MAX_OUTPUT_TOKENS *
          limits.GUEST_OUTPUT_USD_PER_MILLION) /
        1e6,
    ).toBeLessThanOrEqual(limits.GUEST_MAX_COST_USD);
    const context = {
      payingCustomers: "0" as const,
      weeklyTime: "Less than 1 hour" as const,
      monthlyBudget: 0,
      currency: "USD" as const,
    };
    const original = JSON.stringify(mockReport);
    const result = await refineStrategy(mockReport, context, [], null, {
      input: settings.REFINEMENT_MAX_INPUT_TOKENS,
      output: settings.REFINEMENT_MAX_OUTPUT_TOKENS,
    }).catch((error) => {
      console.info({
        reason: error.reason,
        inputTokens: error.inputTokens,
        outputTokens: error.outputTokens,
      });
      throw error;
    });
    expect(validateStrategy(result.strategy, context).schemaVersion).toBe(
      "3.0",
    );
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(JSON.stringify(mockReport)).toBe(original);
    console.log(
      `Validated real refinement: ${result.inputTokens} input tokens, ${result.outputTokens} output tokens. No crawl; facts unchanged.`,
    );
  },
  120000,
);
