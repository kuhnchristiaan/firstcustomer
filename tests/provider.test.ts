import { beforeEach, afterEach, it, expect, vi } from "vitest";
const f = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: f.create };
  },
}));
import { provider, ProviderOutputError } from "@/modules/analysis/provider";
import { mockReport } from "@/modules/analysis/mock";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DATABASE_URL", "postgresql://unused/firstcustomers");
  vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.com/auth");
  vi.stubEnv(
    "NEON_AUTH_COOKIE_SECRET",
    "test-only-cookie-secret-more-than-32-chars",
  );
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("OPENAI_API_KEY", "test-key-not-a-real-secret");
  vi.stubEnv("MOCK_ANALYSIS", "false");
});
afterEach(() => vi.unstubAllEnvs());
it("enforces the guest token bound including the structured schema before calling OpenAI", async () => {
  await expect(
    provider().analyze([], AbortSignal.timeout(1000), {
      inputTokens: 100,
      outputTokens: 6000,
    }),
  ).rejects.toThrow("input budget");
  expect(f.create).not.toHaveBeenCalled();
});
it("runs development fixtures with a blank API key from .env.example", async () => {
  vi.stubEnv("MOCK_ANALYSIS", "true");
  vi.stubEnv("OPENAI_API_KEY", "");
  const result = await provider().analyze([], AbortSignal.timeout(1000));
  expect(result.report).toEqual(mockReport);
  expect(result.inputTokens).toBe(0);
  expect(f.create).not.toHaveBeenCalled();
});
it("validates structured output and records provider usage", async () => {
  f.create.mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify(mockReport),
    usage: { input_tokens: 100, output_tokens: 300 },
  });
  const result = await provider().analyze([], AbortSignal.timeout(1000));
  expect(result.report).toEqual(mockReport);
  expect(result.inputTokens).toBe(100);
  expect(result.outputTokens).toBe(300);
  expect(f.create.mock.calls[0][0].max_output_tokens).toBe(4500);
});
it("retains known billed usage for malformed output", async () => {
  f.create.mockResolvedValue({
    status: "completed",
    output_text: "{broken",
    usage: { input_tokens: 100, output_tokens: 30 },
  });
  await expect(
    provider().analyze([], AbortSignal.timeout(1000)),
  ).rejects.toMatchObject({ inputTokens: 100, outputTokens: 30 });
});
it("rejects incomplete output without inventing a fallback report", async () => {
  f.create.mockResolvedValue({
    status: "incomplete",
    output_text: "",
    usage: { input_tokens: 100, output_tokens: 4500 },
  });
  await expect(
    provider().analyze([], AbortSignal.timeout(1000)),
  ).rejects.toBeInstanceOf(ProviderOutputError);
});
it("forbids development mock mode in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("MOCK_ANALYSIS", "true");
  await expect(
    provider().analyze([], AbortSignal.timeout(1000)),
  ).rejects.toThrow("forbidden in production");
  expect(f.create).not.toHaveBeenCalled();
});
