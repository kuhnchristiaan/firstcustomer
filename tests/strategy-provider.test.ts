import { beforeEach, afterEach, it, expect, vi } from "vitest";
const calls = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: calls.create };
  },
}));
import { refineStrategy } from "@/modules/strategy/provider";
import { mockReport } from "@/modules/analysis/mock";
import { mockStrategy } from "@/modules/strategy/mock";
beforeEach(() => {
  vi.resetAllMocks();
  for (const [k, v] of Object.entries({
    DATABASE_URL: "postgresql://unused/test",
    NEON_AUTH_BASE_URL: "https://auth.example.com/auth",
    NEON_AUTH_COOKIE_SECRET: "test-only-cookie-secret-over-32-characters",
    APP_URL: "http://localhost:3000",
    OPENAI_API_KEY: "test-not-a-real-key",
    MOCK_ANALYSIS: "false",
  }))
    vi.stubEnv(k, v);
});
afterEach(() => vi.unstubAllEnvs());
const context = {
  payingCustomers: "0" as const,
  weeklyTime: "Less than 1 hour" as const,
  monthlyBudget: 0,
  currency: "USD" as const,
};
it("uses stored facts, evidence and founder context in bounded structured output", async () => {
  const strategy = mockStrategy(mockReport, context);
  calls.create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify(strategy),
    usage: { input_tokens: 1000, output_tokens: 600 },
  });
  const original = JSON.stringify(mockReport);
  const result = await refineStrategy(
    mockReport,
    context,
    [{ url: "https://example.com", content: "Stored evidence" }],
    null,
    { input: 30000, output: 4500 },
  );
  expect(result).toMatchObject({
    inputTokens: 1000,
    outputTokens: 600,
    strategy: { schemaVersion: "2.0" },
  });
  const request = calls.create.mock.calls[0][0],
    payload = JSON.parse(request.input[1].content);
  expect(payload.founderConfirmed).toEqual(context);
  expect(payload.hardConstraints).toMatchObject({
    maxTotalChannelMinutesPerWeek: 45,
    maxTotalActionMinutesPerWeek: 45,
    maxTotalChannelCostPerMonth: 0,
    requiredCostCurrency: "USD",
  });
  expect(payload.productIntelligence.businessName).toBe(
    mockReport.businessName,
  );
  expect(payload.supportingEvidence[0].content).toBe("Stored evidence");
  expect(request.max_output_tokens).toBe(4500);
  expect(request.text.format.type).toBe("json_schema");
  expect(JSON.stringify(mockReport)).toBe(original);
});
it("retains a safe diagnostic and usage when total channel effort exceeds the cap", async () => {
  const output = mockStrategy(mockReport, context);
  output.channels[0].weeklyMinutes = 45;
  output.channels[1].weeklyMinutes = 30;
  calls.create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify(output),
    usage: { input_tokens: 900, output_tokens: 500 },
  });
  await expect(
    refineStrategy(mockReport, context, [], null, {
      input: 30000,
      output: 4500,
    }),
  ).rejects.toMatchObject({
    reason: "Channel effort exceeds weekly allowance",
    inputTokens: 900,
    outputTokens: 500,
  });
});
it("rejects oversized inputs before making a paid call", async () => {
  await expect(
    refineStrategy(mockReport, context, [], null, { input: 100, output: 4500 }),
  ).rejects.toThrow("budget");
  expect(calls.create).not.toHaveBeenCalled();
});
it("records usage for invalid or incomplete model output without a fallback strategy", async () => {
  calls.create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({
      ...mockStrategy(mockReport, context),
      schemaVersion: "invalid",
    }),
    usage: { input_tokens: 100, output_tokens: 200 },
  });
  await expect(
    refineStrategy(mockReport, context, [], null, {
      input: 30000,
      output: 4500,
    }),
  ).rejects.toMatchObject({ inputTokens: 100, outputTokens: 200 });
});
