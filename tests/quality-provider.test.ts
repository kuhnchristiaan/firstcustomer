import { compactFixture } from "./fixtures/acquisition";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
const transport = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: transport.create };
  },
}));
import { provider } from "@/modules/analysis/provider";
import {
  commercialCases,
  commercialFixture,
} from "./fixtures/commercial-quality";
import { selectionOf } from "./fixtures/product-attribution";
import { passingReview } from "./fixtures/quality-review";
import { estimateRequestTokens } from "@/modules/analysis/token-budget";

beforeEach(() => {
  vi.resetAllMocks();
  for (const [k, v] of Object.entries({
    DATABASE_URL: "postgresql://unused/firstcustomers",
    NEON_AUTH_BASE_URL: "https://auth.example.com/auth",
    NEON_AUTH_COOKIE_SECRET: "test-only-cookie-secret-over-32-characters",
    APP_URL: "http://localhost:3000",
    OPENAI_API_KEY: "test-not-a-real-key",
    MOCK_ANALYSIS: "false",
  }))
    vi.stubEnv(k, v);
});
afterEach(() => vi.unstubAllEnvs());
const response = (value: unknown) => ({
  status: "completed",
  output_text: JSON.stringify(value),
  usage: { input_tokens: 200, output_tokens: 150 },
});

it.each(commercialCases)(
  "publishes $name only after the final gate within unchanged total budgets",
  async (c) => {
    const f = commercialFixture(c);
    transport.create
      .mockResolvedValueOnce(response(selectionOf(f.profile)))
      .mockResolvedValueOnce(response(compactFixture(f.report)))
      .mockResolvedValueOnce(response(passingReview));
    const result = await provider().analyze(
      [f.source],
      AbortSignal.timeout(3000),
    );
    expect(result.report.schemaVersion).toBe("1.1");
    if (result.report.schemaVersion !== "1.1") throw Error("fixture");
    expect(result.report.quality?.stages).toHaveLength(3);
    expect(result.report.quality?.repairs).toBe(0);
    expect(result.inputTokens).toBe(600);
    expect(result.outputTokens).toBe(450);
    const requests = transport.create.mock.calls.map(([r]) => ({
      stage: r.text.format.name,
      requestBytes: Buffer.byteLength(JSON.stringify(r)),
      maxOutputTokens: r.max_output_tokens,
      reservedInputTokens: estimateRequestTokens(r, r.model).tokens,
    }));
    requests.forEach((r, i) => {
      expect(i * 200 + r.reservedInputTokens).toBeLessThanOrEqual(20000);
      expect(i * 150 + r.maxOutputTokens).toBeLessThanOrEqual(4500);
    });
    // Optional local accounting artifact: request sizes are measured; provider
    // usage is SCRIPTED. No API key, model request or provider operation occurs.
    if (process.env.M6_MEASUREMENTS_DIR)
      writeFileSync(
        `${process.env.M6_MEASUREMENTS_DIR}/${c.name.toLowerCase()}-requests.json`,
        JSON.stringify(
          {
            mode: "mock-transport; measured UTF-8 bytes; no real model token counts",
            model: "gpt-4.1-mini",
            requests,
          },
          null,
          2,
        ),
      );
  },
);

it("repairs an initial message once without changing the attributed product or unrelated sections", async () => {
  const f = commercialFixture(),
    bad = structuredClone(f.report);
  bad.outreachTemplates[0].body =
    "Hello dear founder please consider this invitation today";
  transport.create
    .mockResolvedValueOnce(response(selectionOf(f.profile)))
    .mockResolvedValueOnce(
      response({
        ...compactFixture(f.report),
        messages: bad.outreachTemplates.map(({ subject, body }) => ({
          subject,
          body,
        })),
        firstExperiment: {
          ...compactFixture(f.report).firstExperiment,
          commercialLearning: bad.firstExperiment!.commercialLearning,
        },
      }),
    )
    .mockResolvedValueOnce(
      response({ "messages.0.body": f.report.outreachTemplates[0].body }),
    )
    .mockResolvedValueOnce(response(passingReview));
  const result = await provider().analyze(
    [f.source],
    AbortSignal.timeout(3000),
  );
  expect(
    result.report.schemaVersion === "1.1" && result.report.quality?.repairs,
  ).toBe(1);
  expect(result.report.outreachTemplates.map((m) => m.body)).toEqual(
    f.report.outreachTemplates.map((m) => m.body),
  );
  expect(result.report.segments.map((s) => s.name)).toEqual(
    f.report.segments.map((s) => s.name),
  );
  expect(
    result.report.schemaVersion === "1.1" && result.report.productIntelligence,
  ).toEqual(f.profile);
  expect(result.inputTokens).toBe(800);
  expect(result.outputTokens).toBe(600);
  expect(transport.create.mock.calls.map(([r]) => r.text.format.name)).toEqual([
    "attributed_product_profile",
    "acquisition_strategy",
    "quality_repair",
    "quality_review",
  ]);
});

it("returns incomplete analysis and all billed usage when the repaired output still fails", async () => {
  const f = commercialFixture(),
    bad = structuredClone(f.report);
  bad.outreachTemplates[0].body =
    "Hello dear founder please consider this invitation today";
  transport.create
    .mockResolvedValueOnce(response(selectionOf(f.profile)))
    .mockResolvedValueOnce(
      response({
        ...compactFixture(f.report),
        messages: bad.outreachTemplates.map(({ subject, body }) => ({
          subject,
          body,
        })),
        firstExperiment: {
          ...compactFixture(f.report).firstExperiment,
          commercialLearning: bad.firstExperiment!.commercialLearning,
        },
      }),
    )
    .mockResolvedValueOnce(
      response({ "messages.0.body": bad.outreachTemplates[0].body }),
    )
    .mockResolvedValueOnce(response(passingReview));
  await expect(
    provider().analyze([f.source], AbortSignal.timeout(3000)),
  ).rejects.toMatchObject({
    reason: "quality_failed",
    inputTokens: 600,
    outputTokens: 450,
  });
  expect(transport.create).toHaveBeenCalledTimes(3);
});

it("rejects exhausted output budget before attempting a paid review or publishing a candidate", async () => {
  vi.stubEnv("OPENAI_MODEL", "gpt-4.1-mini");
  const f = commercialFixture();
  // A semantic defect requires repair after a review exhausts the output cap.
  const failedReview = structuredClone(passingReview);
  failedReview.scores.outreachCompleteness = 0;
  failedReview.issues = [
    {
      section: "messages.0.body",
      reason: "Messages need a sharper buyer-specific commercial question",
    },
  ];
  transport.create
    .mockReset()
    .mockResolvedValueOnce({
      ...response(selectionOf(f.profile)),
      usage: { input_tokens: 200, output_tokens: 900 },
    })
    .mockResolvedValueOnce({
      ...response(compactFixture(f.report)),
      usage: { input_tokens: 200, output_tokens: 2950 },
    })
    .mockResolvedValueOnce({
      ...response(failedReview),
      usage: { input_tokens: 200, output_tokens: 650 },
    });
  await expect(
    provider().analyze([f.source], AbortSignal.timeout(3000)),
  ).rejects.toMatchObject({ reason: "quality_failed", outputTokens: 4500 });
  expect(transport.create).toHaveBeenCalledTimes(3);
});

it("checks factual claims inside the new experiment contract and repairs only that contract", async () => {
  const f = commercialFixture(),
    bad = structuredClone(f.report);
  bad.firstExperiment!.commercialLearning =
    "If security matters, our product is GDPR-compliant.";
  transport.create
    .mockResolvedValueOnce(response(selectionOf(f.profile)))
    .mockResolvedValueOnce(
      response({
        ...compactFixture(f.report),
        messages: bad.outreachTemplates.map(({ subject, body }) => ({
          subject,
          body,
        })),
        firstExperiment: {
          ...compactFixture(f.report).firstExperiment,
          commercialLearning: bad.firstExperiment!.commercialLearning,
        },
      }),
    )
    .mockResolvedValueOnce(
      response({
        "firstExperiment.commercialLearning":
          f.report.firstExperiment!.commercialLearning,
      }),
    )
    .mockResolvedValueOnce(response(passingReview));
  const result = await provider().analyze(
    [f.source],
    AbortSignal.timeout(3000),
  );
  expect(
    result.report.schemaVersion === "1.1" && result.report.firstExperiment,
  ).toMatchObject({
    commercialLearning: f.report.firstExperiment!.commercialLearning,
  });
  const patch = transport.create.mock.calls[2][0];
  expect(patch.text.format.name).toBe("quality_repair");
  expect(Object.keys(patch.text.format.schema.properties)).toEqual([
    "firstExperiment.commercialLearning",
  ]);
});

it("accounts for an incomplete field repair and never reviews or publishes its partial JSON", async () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  s.messages[0].body =
    "Hello dear founder please consider this invitation today";
  transport.create
    .mockResolvedValueOnce(response(selectionOf(f.profile)))
    .mockResolvedValueOnce(response(s))
    .mockResolvedValueOnce({
      status: "incomplete",
      output_text: '{"messages.0.body":',
      usage: { input_tokens: 200, output_tokens: 600 },
    });
  await expect(
    provider().analyze([f.source], AbortSignal.timeout(3000), {
      inputTokens: 20000,
      outputTokens: 4500,
    }),
  ).rejects.toMatchObject({
    reason: "quality_failed",
    inputTokens: 600,
    outputTokens: 900,
    qualityFailure: { code: "quality_repair_invalid" },
  });
  expect(transport.create).toHaveBeenCalledTimes(3);
});

it("reserves repair AND final review after a semantic defect at legacy production stage ceilings", async () => {
  vi.stubEnv("OPENAI_MODEL", "gpt-4.1-mini");
  const f = commercialFixture(),
    s = compactFixture(f.report),
    rejected = structuredClone(passingReview);
  rejected.scores.commercialRealism = 0;
  rejected.issues = [
    {
      section: "paymentPath.paidConversion",
      reason: "Clarify how engagement leads to payment",
    },
  ];
  const billed = (value: unknown, out: number) => ({
    ...response(value),
    usage: { input_tokens: 200, output_tokens: out },
  });
  transport.create
    .mockResolvedValueOnce(billed(selectionOf(f.profile), 600))
    .mockResolvedValueOnce(billed(s, 2000))
    .mockResolvedValueOnce(billed(rejected, 650))
    .mockResolvedValueOnce(
      billed(
        { "paymentPath.paidConversion": s.paymentPath.paidConversion },
        600,
      ),
    )
    .mockResolvedValueOnce(billed(passingReview, 650));
  const result = await provider().analyze(
    [f.source],
    AbortSignal.timeout(3000),
    { inputTokens: 20000, outputTokens: 4500 },
  );
  expect(result.outputTokens).toBe(4500);
  expect(transport.create.mock.calls.map(([r]) => r.max_output_tokens)).toEqual(
    [600, 2000, 650, 600, 650],
  );
  expect(
    result.report.schemaVersion === "1.1" && result.report.quality?.repairs,
  ).toBe(1);
});

it("repairs dependent numeric phase estimates together, rebuilds every week, then requires semantic review", async () => {
  const f = commercialFixture(),
    s = compactFixture(f.report);
  s.firstExperiment.resources.assumedMinutes = 30;
  s.firstExperiment.resources.researchMinutesPerActivity = 1;
  transport.create
    .mockResolvedValueOnce(response(selectionOf(f.profile)))
    .mockResolvedValueOnce(response(s))
    .mockResolvedValueOnce(
      response({
        "firstExperiment.resources.assumedMinutes": 60,
        "firstExperiment.resources.researchMinutesPerActivity": 5,
      }),
    )
    .mockResolvedValueOnce(response(passingReview));
  const result = await provider().analyze(
    [f.source],
    AbortSignal.timeout(3000),
    { inputTokens: 20000, outputTokens: 4500 },
  );
  expect(transport.create.mock.calls.map(([r]) => r.text.format.name)).toEqual([
    "attributed_product_profile",
    "acquisition_strategy",
    "quality_repair",
    "quality_review",
  ]);
  expect(
    Object.keys(
      transport.create.mock.calls[2][0].text.format.schema.properties,
    ).sort(),
  ).toEqual([
    "firstExperiment.resources.assumedMinutes",
    "firstExperiment.resources.researchMinutesPerActivity",
  ]);
  for (const week of result.report.thirtyDayPlan)
    expect(
      week.actions.some((a) => a.includes("budget 60 min; planned 36 min")),
    ).toBe(true);
  expect(
    result.report.schemaVersion === "1.1" && result.report.quality?.repairs,
  ).toBe(1);
});
it('reserves Sol reasoning-aware reviews, one repair and final review within exactly 8000 tokens', async()=>{
 vi.stubEnv('OPENAI_MODEL','gpt-6.1-sol');vi.stubEnv('MAX_OUTPUT_TOKENS','8000');
 const f=commercialFixture(),s=compactFixture(f.report),rejected=structuredClone(passingReview);
 rejected.scores.commercialRealism=0;rejected.issues=[{section:'paymentPath.paidConversion',reason:'Clarify actual buying step'}];
 const billed=(v:unknown,n:number)=>({...response(v),usage:{input_tokens:200,output_tokens:n,output_tokens_details:{reasoning_tokens:277}}});
 transport.create.mockResolvedValueOnce(billed(selectionOf(f.profile),1200))
 .mockResolvedValueOnce(billed(s,2800)).mockResolvedValueOnce(billed(rejected,1500))
 .mockResolvedValueOnce(billed({'paymentPath.paidConversion':s.paymentPath.paidConversion},1000))
 .mockResolvedValueOnce(billed(passingReview,1500));
 const result=await provider().analyze([f.source],AbortSignal.timeout(3000));
 expect(result.outputTokens).toBe(8000);
 expect(transport.create.mock.calls.map(([r])=>r.max_output_tokens)).toEqual([1200,2800,1500,1000,1500]);
 expect(transport.create.mock.calls.every(([r])=>r.model==='gpt-6.1-sol')).toBe(true);
 expect(result.report.schemaVersion==='1.1'&&result.report.quality?.repairs).toBe(1);
});
it('rejects an incomplete Sol quality review without retrying or publishing',async()=>{
 vi.stubEnv('OPENAI_MODEL','gpt-6.1-sol');vi.stubEnv('MAX_OUTPUT_TOKENS','8000');
 const f=commercialFixture();transport.create.mockResolvedValueOnce(response(selectionOf(f.profile)))
 .mockResolvedValueOnce(response(compactFixture(f.report)))
 .mockResolvedValueOnce({...response(passingReview),status:'incomplete',output_text:'{"scores":',usage:{input_tokens:200,output_tokens:1500}});
 await expect(provider().analyze([f.source],AbortSignal.timeout(3000))).rejects.toMatchObject({reason:'quality_failed',qualityFailure:{code:'quality_review_invalid'}});
 expect(transport.create).toHaveBeenCalledTimes(3);expect(transport.create.mock.calls[2][0].max_output_tokens).toBe(1500);
});
