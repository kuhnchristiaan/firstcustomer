import { beforeEach, afterEach, it, expect, vi } from "vitest";
const f = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: f.create };
  },
}));
import { provider, ProviderOutputError } from "@/modules/analysis/provider";
import { mockReport } from "@/modules/analysis/mock";
import {
  attributionSites,
  siteFixture,
  selectionOf,
} from "./fixtures/product-attribution";
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
    provider().analyze([siteFixture().source], AbortSignal.timeout(1000), {
      inputTokens: 100,
      outputTokens: 6000,
    }),
  ).rejects.toThrow("input budget");
  expect(f.create).not.toHaveBeenCalled();
});
it("runs development fixtures with a blank API key from .env.example", async () => {
  vi.stubEnv("MOCK_ANALYSIS", "true");
  vi.stubEnv("OPENAI_API_KEY", "");
  const result = await provider().analyze(
    [siteFixture().source],
    AbortSignal.timeout(1000),
  );
  expect(result.report).toEqual(mockReport);
  expect(result.inputTokens).toBe(0);
  expect(f.create).not.toHaveBeenCalled();
});
it.each(attributionSites)(
  "validates attributed $name output and records bounded provider usage",
  async (site) => {
    const fixture = siteFixture(site);
    f.create
      .mockResolvedValueOnce({
        status: "completed",
        output_text: JSON.stringify(selectionOf(fixture.profile)),
        usage: { input_tokens: 50, output_tokens: 100 },
      })
      .mockResolvedValueOnce({
        status: "completed",
        output_text: JSON.stringify({
          ...fixture.report,
          recommendationBasis: fixture.basis,
        }),
        usage: { input_tokens: 100, output_tokens: 300 },
      });
    const result = await provider().analyze(
      [fixture.source],
      AbortSignal.timeout(1000),
    );
    expect(result.report.schemaVersion).toBe("1.1");
    expect(result.report.overview).toEqual(fixture.report.overview);
    expect(result.inputTokens).toBe(150);
    expect(result.outputTokens).toBe(400);
    expect(f.create.mock.calls[0][0].max_output_tokens).toBe(900);
    expect(f.create.mock.calls[1][0].max_output_tokens).toBe(3600);
    const generationInput = JSON.parse(
      f.create.mock.calls[1][0].input[1].content,
    );
    expect(generationInput.product.statements).toEqual(
      fixture.profile.statements,
    );
    expect(Object.keys(generationInput.product)).toEqual([
      "identity",
      "statements",
    ]);
    const identification = JSON.parse(
      f.create.mock.calls[0][0].input[1].content,
    );
    expect(
      identification.documents[0].blocks.every(
        (b: { kind: string }) => b.kind === "Owner candidate",
      ),
    ).toBe(true);
    expect(generationInput.product.identity.primaryJob).toEqual(
      fixture.profile.identity.primaryJob,
    );
    expect(result.report.segments[0].problems).toEqual([site.problem]);
    expect(result.report.acquisitionChannels[0].steps).toEqual(
      fixture.report.acquisitionChannels[0].steps,
    );
    expect(f.create).toHaveBeenCalledTimes(2);
  },
);
it("fails closed and retains both-stage usage if report generation fails after product attribution", async () => {
  const fixture = siteFixture();
  f.create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(selectionOf(fixture.profile)),
      usage: { input_tokens: 200, output_tokens: 100 },
    })
    .mockResolvedValueOnce({
      status: "completed",
      output_text: "{}",
      usage: { input_tokens: 300, output_tokens: 200 },
    });
  await expect(
    provider().analyze([fixture.source], AbortSignal.timeout(1000)),
  ).rejects.toMatchObject({ inputTokens: 500, outputTokens: 300 });
});
it("retains known billed usage for malformed output", async () => {
  f.create.mockResolvedValue({
    status: "completed",
    output_text: "{broken",
    usage: { input_tokens: 100, output_tokens: 30 },
  });
  await expect(
    provider().analyze([siteFixture().source], AbortSignal.timeout(1000)),
  ).rejects.toMatchObject({ inputTokens: 100, outputTokens: 30 });
});
it("rejects incomplete output without inventing a fallback report", async () => {
  f.create.mockResolvedValue({
    status: "incomplete",
    output_text: "",
    usage: { input_tokens: 100, output_tokens: 4500 },
  });
  await expect(
    provider().analyze([siteFixture().source], AbortSignal.timeout(1000)),
  ).rejects.toBeInstanceOf(ProviderOutputError);
});
it("forbids development mock mode in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("MOCK_ANALYSIS", "true");
  await expect(
    provider().analyze([siteFixture().source], AbortSignal.timeout(1000)),
  ).rejects.toThrow("forbidden in production");
  expect(f.create).not.toHaveBeenCalled();
});
