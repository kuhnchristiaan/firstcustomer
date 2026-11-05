import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  transaction: vi.fn(),
  failed: vi.fn(),
  analyze: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    $transaction: state.transaction,
    analysisRun: { updateMany: state.failed },
  }),
}));
vi.mock("@/modules/analysis/provider", async (original) => {
  const providerModule =
    await original<typeof import("@/modules/analysis/provider")>();
  return { ...providerModule, provider: () => ({ analyze: state.analyze }) };
});
vi.mock("@/modules/config/env", () => ({
  config: () => ({
    MOCK_ANALYSIS: "false",
    MAX_PAGES: 1,
    MAX_INPUT_TOKENS: 20000,
    MAX_CONTENT_CHARS: 4000,
    MAX_OUTPUT_TOKENS: 4500,
  }),
}));
vi.mock("@/modules/website/extract", () => ({ crawl: async () => [] }));
vi.mock("@/modules/analytics/service", () => ({ metric: vi.fn() }));
import { executeAnalysis } from "@/modules/analysis/execute";
import { ProviderOutputError } from "@/modules/analysis/provider";

it("never enters the publication transaction when the quality gate rejects; no output is persisted", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.analyze.mockRejectedValueOnce(
    new ProviderOutputError(1000, 2000, "quality_failed"),
  );
  try {
    await expect(
      executeAnalysis("offline-run", "offline-product", "https://example.com/"),
    ).rejects.toThrow();
    expect(state.transaction).not.toHaveBeenCalled();
    expect(state.failed).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          inputTokens: 1000,
          outputTokens: 2000,
        }),
      }),
    );
    expect(state.failed.mock.calls[0][0].data).not.toHaveProperty("output");
  } finally {
    log.mockRestore();
  }
});
