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
      fixture.profile.statements.map(({ evidence, ...statement }) => {
        void evidence;
        return statement;
      }),
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

it("fits a detailed four-claim profile inside the unchanged signed-in input cap", async () => {
  const { extract } = await import("@/modules/website/extract");
  const { limitDocument } = await import("@/modules/website/document");
  const fixture = siteFixture();
  const descriptions = [
    "Audience identification",
    "Sales messaging",
    "Acquisition experiments",
    "Thirty-day action plans",
  ].map(
    (label) =>
      `${fixture.profile.identity.name} provides ${label}. ` +
      "This website describes a practical founder workflow, its intended customer and the evidence required to test a customer acquisition hypothesis. ".repeat(
        3,
      ),
  );
  const source = extract(
    `<title>FirstCustomers product</title><main><h1>FirstCustomers</h1>${descriptions.map((text) => `<p>${text}</p>`).join("")}</main>`,
    fixture.source.url,
  );
  source.content = JSON.stringify(limitDocument(source.document, 4125));
  const blocks = JSON.parse(source.content).blocks.filter(
    (b: { text: string }) => b.text.startsWith("FirstCustomers provides"),
  );
  fixture.profile.statements = blocks.map(
    (b: { id: string; text: string }, i: number) => ({
      id: i === 0 ? "owner-capability" : `owner-${i}`,
      text: b.text.slice(0, 400),
      kind: "Owner product claim" as const,
      subject: "Owner product" as const,
      evidence: [
        { sourceUrl: source.url, blockId: b.id, quote: b.text.slice(0, 400) },
      ],
    }),
  );
  fixture.profile.identity.evidence = [
    fixture.profile.statements[0].evidence[0],
  ];
  fixture.profile.identity.summary = fixture.profile.statements[0].text;
  const selection = selectionOf(fixture.profile);
  selection.identity.summary = selection.identity.summary.slice(0, 240);
  selection.statements = selection.statements.map((s) => ({
    ...s,
    text: s.text.slice(0, 240),
  }));
  f.create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(selection),
      usage: { input_tokens: 500, output_tokens: 300 },
    })
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        ...fixture.report,
        recommendationBasis: fixture.basis,
      }),
      usage: { input_tokens: 700, output_tokens: 1000 },
    });
  const result = await provider().analyze([source], AbortSignal.timeout(1000), {
    inputTokens: 20000,
    outputTokens: 4500,
  });
  expect(result.report.schemaVersion).toBe("1.1");
  expect(f.create).toHaveBeenCalledTimes(2);
  const bytes = f.create.mock.calls.reduce(
    (sum, [request]) =>
      sum + Buffer.byteLength(JSON.stringify(request), "utf8") + 1024,
    0,
  );
  expect(bytes).toBeLessThanOrEqual(20000);
  // Reconstruct the previous request representation: the same profile would
  // cross the cap when quotations and repeated schema objects were inlined.
  const { z } = await import("zod");
  const { zodTextFormat } = await import("openai/helpers/zod");
  const { reportV1Schema } = await import("@/modules/intelligence/schema");
  const { basisSchema } =
    await import("@/modules/intelligence/product-profile");
  const { generationProductProfile } =
    await import("@/modules/intelligence/attribution");
  if (result.report.schemaVersion !== "1.1")
    throw Error("Attributed output required");
  const ids = result.report.productIntelligence.statements.map((s) => s.id) as [
    string,
    ...string[],
  ];
  const oldSchema = reportV1Schema.extend({
    recommendationBasis: z
      .array(
        basisSchema.element.extend({
          statementIds: z.array(z.enum(ids)).min(1).max(4),
        }),
      )
      .length(5),
  });
  const oldRequests = f.create.mock.calls.map(([request]) =>
    JSON.parse(JSON.stringify(request)),
  );
  oldRequests[1].text.format = zodTextFormat(
    oldSchema,
    "business_intelligence",
  );
  const oldData = JSON.parse(oldRequests[1].input[1].content);
  oldData.product = generationProductProfile(result.report.productIntelligence);
  oldRequests[1].input[1].content = JSON.stringify(oldData);
  expect(
    oldRequests.reduce(
      (sum, request) =>
        sum + Buffer.byteLength(JSON.stringify(request), "utf8") + 1024,
      0,
    ),
  ).toBeGreaterThan(20000);
  expect(
    f.create.mock.calls.reduce((sum, [r]) => sum + r.max_output_tokens, 0),
  ).toBe(4500);
});
