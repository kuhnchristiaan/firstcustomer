import { beforeEach, afterEach, it, expect, vi } from "vitest";
const calls = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: calls.create };
  },
}));
import { refineStrategy } from "@/modules/strategy/provider";
import { mockReport } from "@/modules/analysis/mock";
import { mockIntelligence } from "@/modules/strategy/mock-intelligence";
import { mockStrategy } from "@/modules/strategy/mock";
import { passingReview } from "./fixtures/quality-review";
import { writeFileSync } from "node:fs";
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
function reviewFixture() {
  const reviewed = mockIntelligence(
    mockReport,
    context,
    mockStrategy(mockReport, context),
  );
  if (reviewed.schemaVersion !== "3.0") throw new Error("Invalid fixture");
  const { claimActions, generation, effortBreakdown, ...assessment } =
    reviewed.intelligence;
  void claimActions;
  void generation;
  void effortBreakdown;
  return assessment;
}
it("rejects unsupported final copy instead of silently publishing a sanitized summary", async () => {
  const candidate = mockStrategy(mockReport, context);
  const finalStrategy = structuredClone(candidate);
  finalStrategy.executiveSummary = "We reduce admin time by 50%.";
  const assessment = reviewFixture();
  assessment.verdict = "revise";
  assessment.corrections = ["Remove an unsupported performance assertion."];
  calls.create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(candidate),
      usage: { input_tokens: 700, output_tokens: 400 },
    })
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        assessment,
        finalStrategy,
        quality: passingReview,
      }),
      usage: { input_tokens: 800, output_tokens: 500 },
    });
  await expect(
    refineStrategy(mockReport, context, [], null, {
      input: 40000,
      output: 8000,
    }),
  ).rejects.toMatchObject({
    reason: "critique_failed",
    inputTokens: 1500,
    outputTokens: 900,
  });
});
it.each(["malformed", "inconsistent"])(
  "rejects %s critique and preserves usage from both calls",
  async (kind) => {
    const assessment = reviewFixture();
    calls.create
      .mockResolvedValueOnce({
        status: "completed",
        output_text: JSON.stringify(mockStrategy(mockReport, context)),
        usage: { input_tokens: 700, output_tokens: 400 },
      })
      .mockResolvedValueOnce({
        status: "completed",
        output_text: JSON.stringify(
          kind === "malformed"
            ? {}
            : {
                assessment,
                finalStrategy: mockStrategy(mockReport, context),
                quality: passingReview,
              },
        ),
        usage: { input_tokens: 800, output_tokens: 500 },
      });
    await expect(
      refineStrategy(mockReport, context, [], null, {
        input: 40000,
        output: 8000,
      }),
    ).rejects.toMatchObject({
      reason: "critique_failed",
      inputTokens: 1500,
      outputTokens: 900,
    });
    expect(calls.create).toHaveBeenCalledTimes(2);
  },
);
it("uses stored facts, evidence and founder context in bounded structured output", async () => {
  const strategy = mockStrategy(mockReport, context);
  const reviewed = mockIntelligence(mockReport, context, strategy);
  if (reviewed.schemaVersion !== "3.0")
    throw new Error("Invalid fixture version");
  const {
    claimActions: _actions,
    generation: _generation,
    effortBreakdown: _effort,
    ...assessment
  } = reviewed.intelligence;
  void _actions;
  void _generation;
  void _effort;
  calls.create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(strategy),
      usage: { input_tokens: 1000, output_tokens: 600 },
    })
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        assessment,
        finalStrategy: null,
        quality: passingReview,
      }),
      usage: { input_tokens: 1200, output_tokens: 700 },
    });
  const original = JSON.stringify(mockReport);
  const result = await refineStrategy(
    mockReport,
    context,
    [{ url: "https://example.com", content: "Stored evidence" }],
    null,
    { input: 40000, output: 8000 },
  );
  expect(result).toMatchObject({
    inputTokens: 2200,
    outputTokens: 1300,
    strategy: { schemaVersion: "3.0" },
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
  expect(request.max_output_tokens).toBe(3555);
  expect(
    request.text.format.schema.properties.weeks.items.properties.actions.items
      .properties.minutes.maximum,
  ).toBe(15);
  expect(
    request.text.format.schema.properties.channels.items.properties
      .monthlyDirectCost.maximum,
  ).toBe(0);
  expect(request.text.format.schema.properties.executiveSummary.maxLength).toBe(
    180,
  );
  expect(calls.create).toHaveBeenCalledTimes(2);
  expect(request.text.format.type).toBe("json_schema");
  expect(JSON.stringify(mockReport)).toBe(original);
  if (process.env.M6_MEASUREMENTS_DIR) {
    const requests = calls.create.mock.calls.map(([r]) => ({
      stage: r.text.format.name,
      requestBytes: Buffer.byteLength(JSON.stringify(r)),
      systemBytes: Buffer.byteLength(r.input[0].content),
      maxOutputTokens: r.max_output_tokens,
    }));
    const schema = calls.create.mock.calls[1][0].text.format.schema;
    const baseline = structuredClone(schema);
    delete baseline.properties.quality;
    baseline.required = baseline.required.filter(
      (k: string) => k !== "quality",
    );
    writeFileSync(
      `${process.env.M6_MEASUREMENTS_DIR}/refinement-requests.json`,
      JSON.stringify(
        {
          mode: "mock-transport; measured UTF-8 bytes; no real model token counts",
          model: "gpt-4.1-mini",
          requests,
          addedQualitySchemaBytes:
            Buffer.byteLength(JSON.stringify(schema)) -
            Buffer.byteLength(JSON.stringify(baseline)),
        },
        null,
        2,
      ),
    );
  }
});
it("retains a safe diagnostic and usage when total channel effort exceeds the cap", async () => {
  const output = mockStrategy(mockReport, context);
  output.channels[0].weeklyMinutes = 45;
  output.channels[1].weeklyMinutes = 30;
  calls.create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(output),
      usage: { input_tokens: 900, output_tokens: 500 },
    })
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        assessment: reviewFixture(),
        quality: passingReview,
        finalStrategy: null,
      }),
      usage: { input_tokens: 100, output_tokens: 200 },
    });
  await expect(
    refineStrategy(mockReport, context, [], null, {
      input: 40000,
      output: 8000,
    }),
  ).rejects.toMatchObject({
    reason: "critique_failed",
    inputTokens: 1000,
    outputTokens: 700,
  });
});
it("rejects oversized inputs before making a paid call", async () => {
  await expect(
    refineStrategy(mockReport, context, [], null, { input: 100, output: 4500 }),
  ).rejects.toThrow("budget");
  expect(calls.create).not.toHaveBeenCalled();
});
it("retains candidate usage when the critique stage fails and never publishes the candidate as final", async () => {
  calls.create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(mockStrategy(mockReport, context)),
      usage: { input_tokens: 700, output_tokens: 400 },
    })
    .mockRejectedValueOnce(new Error("Fixture critique failure"));
  await expect(
    refineStrategy(mockReport, context, [], null, {
      input: 40000,
      output: 8000,
    }),
  ).rejects.toMatchObject({
    reason: "critique_failed",
    inputTokens: 700,
    outputTokens: 400,
  });
  expect(calls.create).toHaveBeenCalledTimes(2);
});
it("does not make a paid critique call when its combined input bound is exceeded", async () => {
  calls.create.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify(mockStrategy(mockReport, context)),
    usage: { input_tokens: 700, output_tokens: 400 },
  });
  const response = refineStrategy(mockReport, context, [], null, {
    input: 8000,
    output: 8000,
  });
  await expect(response).rejects.toMatchObject({
    reason: "critique_input_budget",
    inputTokens: 700,
    outputTokens: 400,
  });
  expect(calls.create).toHaveBeenCalledTimes(1);
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

it("uses the same attributed owner profile for candidate and critical review", async () => {
  const { siteFixture } = await import("./fixtures/product-attribution");
  const { profileEvidence, groundReport } =
    await import("@/modules/intelligence/attribution");
  const f = siteFixture();
  const report = {
    ...groundReport(f.report, f.profile, true),
    schemaVersion: "1.1" as const,
    productIntelligence: f.profile,
    recommendationBasis: f.basis,
  };
  const original = JSON.stringify(report);
  const candidate = mockStrategy(report, context);
  const reviewed = mockIntelligence(report, context, candidate);
  if (reviewed.schemaVersion !== "3.0") throw Error("Fixture");
  const { claimActions, generation, effortBreakdown, ...assessment } =
    reviewed.intelligence;
  void claimActions;
  void generation;
  void effortBreakdown;
  assessment.verdict = "revise";
  assessment.corrections = ["Confirm owner product context."];
  assessment.claims = candidate.prioritizedSegments.map((s, i) => ({
    path: `prioritizedSegments.${i}.rationale`,
    claim: s.rationale,
    classification: "Website-supported" as const,
    sourceUrl: f.source.url,
    quote: f.profile.statements[0].text,
    founderCapability: null,
  }));
  calls.create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(candidate),
      usage: { input_tokens: 100, output_tokens: 100 },
    })
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        assessment,
        finalStrategy: candidate,
        quality: passingReview,
      }),
      usage: { input_tokens: 100, output_tokens: 100 },
    });
  await refineStrategy(report, context, profileEvidence(f.profile), null, {
    input: 40000,
    output: 9000,
  });
  const first = JSON.parse(calls.create.mock.calls[0][0].input[1].content);
  const second = JSON.parse(calls.create.mock.calls[1][0].input[1].content);
  expect(first.productIntelligence.profile.identity).toMatchObject({
    name: f.profile.identity.name,
    primaryJob: f.profile.identity.primaryJob,
    summary: f.profile.identity.summary,
  });
  expect(second.productFacts.profile.identity).toEqual(
    first.productIntelligence.profile.identity,
  );
  expect(
    first.supportingEvidence.every((e: { content: string }) =>
      f.profile.statements.some((s) =>
        s.evidence.some((r) => r.quote === e.content),
      ),
    ),
  ).toBe(true);
  expect(JSON.stringify(report)).toBe(original);
});
