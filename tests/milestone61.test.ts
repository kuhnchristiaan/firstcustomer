import { expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { analysisRequest } from "@/modules/analysis/provider";
import {
  estimateRequestTokens,
  fitsInputBudget,
  assertActualUsage,
} from "@/modules/analysis/token-budget";
import {
  compactReviewInput,
  deterministicQuality,
  qualityGate,
  qualityReviewSchema,
  reviewInstructions,
  reviewIssues,
} from "@/modules/intelligence/quality";
import { generationProductContext } from "@/modules/intelligence/attribution";
import {
  basisSchema,
  productSelectionSchema,
} from "@/modules/intelligence/product-profile";
import { readDocument } from "@/modules/website/document";
import { firstExperimentSchema } from "@/modules/intelligence/experiment";
import { reportV1Schema, reportV11Schema } from "@/modules/intelligence/schema";
import { statementKind } from "@/modules/strategy/claim-semantics";
import {
  verifyClaims,
  safeInitialReport,
  type ClaimReview,
} from "@/modules/strategy/claims";
import { passingReview } from "./fixtures/quality-review";

const root = "docs/milestone-6-live-2026-11-05";
const load = (slug: string, file: string) =>
  JSON.parse(readFileSync(`${root}/${slug}/${file}`, "utf8"));
const sites = ["senja", "greensighter", "firstcustomers", "tally"];
const { schemaVersion, businessName, overview, offerings, ...mutable } =
  reportV1Schema.shape;
void schemaVersion;
void businessName;
void overview;
void offerings;
const fields = { ...mutable, firstExperiment: firstExperimentSchema };
const measurements: unknown[] = [];

it.each(sites)(
  "reproduces %s's byte-preflight rejection, then fits its full compact review using ACTUAL recorded usage",
  (slug) => {
    const result = load(slug, "result.json");
    const old = load(slug, "offline-validation.json").pendingQualityReview;
    const candidate = reportV11Schema.parse(load(slug, "first-candidate.json"));
    expect(old.alreadyBilledInputTokens).toBe(result.usage.inputTokens);
    expect(old.totalInputReservation).toBeGreaterThan(20000);
    const report = Object.fromEntries(
      Object.keys(fields).map((k) => [
        k,
        candidate[k as keyof typeof candidate],
      ]),
    );
    const product = generationProductContext(candidate.productIntelligence);
    const founder = {
      status: "Not supplied",
      budget: "Unknown",
      time: "Unknown",
    };
    const packed = compactReviewInput(product, founder, report);
    const request = analysisRequest(
      qualityReviewSchema,
      "quality_review",
      reviewInstructions,
      packed,
      "gpt-4.1-mini",
      650,
    );
    const estimate = estimateRequestTokens(request, request.model);
    expect(estimate.method).toBe("o200k_base");
    expect(
      fitsInputBudget(
        request,
        request.model,
        result.usage.inputTokens,
        result.limits.inputTokens,
      ),
    ).toBe(true);
    expect(
      result.usage.outputTokens + request.max_output_tokens,
    ).toBeLessThanOrEqual(result.limits.outputTokens);
    const unpack = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(unpack);
      if (v && typeof v === "object") {
        if ("textRef" in v)
          return packed.texts[(v as { textRef: number }).textRef];
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, unpack(x)]),
        );
      }
      return v;
    };
    const strings = (v: unknown): string[] =>
      typeof v === "string"
        ? [v]
        : Array.isArray(v)
          ? v.flatMap(strings)
          : v && typeof v === "object"
            ? Object.values(v).flatMap(strings)
            : [];
    const recovered = new Set(strings(unpack(packed.data)));
    // Every content string, confidence and non-empty provenance URL survives.
    for (const s of strings({ product, founder, report }))
      expect(recovered.has(s)).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(packed))).toBeLessThan(
      Buffer.byteLength(JSON.stringify({ product, founder, report })),
    );
    measurements.push({
      site: slug,
      priorActualInputTokens: result.usage.inputTokens,
      priorActualOutputTokens: result.usage.outputTokens,
      oldInputReservation: old.totalInputReservation,
      reviewBytes: Buffer.byteLength(JSON.stringify(request)),
      newReviewReservation: estimate.tokens,
      totalInputReservation: result.usage.inputTokens + estimate.tokens,
      cap: result.limits.inputTokens,
      reviewOutputCap: 650,
    });
    // Only an explicitly requested OFFLINE artifact write; never changes evidence.
    if (process.env.M61_MEASUREMENTS === "true")
      writeFileSync(
        "docs/milestone-6-1/budget-replay.json",
        JSON.stringify(measurements, null, 2),
      );
  },
);

it.each(sites)(
  "bounds the tokenizer estimate against both %s observed API stages, including structured schemas",
  (slug) => {
    const sources = load(slug, "sources.json");
    const candidate = reportV11Schema.parse(load(slug, "first-candidate.json"));
    const stages = load(slug, "stages.json");
    const ids = sources.flatMap((s: { url: string; content: string }) =>
      readDocument(s)!
        .blocks.filter(
          (b) => b.kind === "Owner candidate" && b.text.length >= 12,
        )
        .map((b) => b.id),
    );
    const ref = z.strictObject({
      blockId: z.enum(ids as [string, ...string[]]),
    });
    const schemas = [
      productSelectionSchema.extend({
        identity: productSelectionSchema.shape.identity.extend({
          evidence: z.array(ref).max(1),
        }),
        statements: z
          .array(
            productSelectionSchema.shape.statements.element.extend({
              evidence: z.array(ref).max(1),
            }),
          )
          .max(4),
      }),
      reportV1Schema.extend({
        recommendationBasis: z
          .array(
            basisSchema.element.extend({
              statementIds: z
                .array(
                  z.enum(
                    candidate.productIntelligence.statements.map(
                      (s) => s.id,
                    ) as [string, ...string[]],
                  ),
                )
                .min(1)
                .max(4),
            }),
          )
          .length(5),
      }),
    ];
    stages.forEach(
      (
        stage: {
          stage: string;
          input: { content: string }[];
          maxOutputTokens: number;
          inputTokens: number;
          requestBytes: number;
        },
        i: number,
      ) => {
        const request = analysisRequest(
          schemas[i],
          stage.stage,
          stage.input[0].content,
          JSON.parse(stage.input[1].content),
          "gpt-4.1-mini",
          stage.maxOutputTokens,
        );
        expect(Buffer.byteLength(JSON.stringify(request))).toBe(
          stage.requestBytes,
        );
        expect(
          estimateRequestTokens(request, request.model).tokens,
        ).toBeGreaterThan(stage.inputTokens);
      },
    );
  },
);

it("retains hard preflight/output/actual-usage bounds and a conservative unknown-model fallback", () => {
  const huge = { input: "different words and tokens ".repeat(30000) };
  expect(fitsInputBudget(huge, "gpt-4.1-mini", 3481, 20000)).toBe(false);
  expect(
    estimateRequestTokens({ input: "hello" }, "unknown-model").method,
  ).toBe("utf8-bound");
  expect(() =>
    assertActualUsage(
      { input: 20001, output: 3000 },
      { input: 20000, output: 8000 },
    ),
  ).toThrow("actual_token_budget_exceeded");
  expect(() =>
    assertActualUsage(
      { input: 4000, output: 8001 },
      { input: 20000, output: 8000 },
    ),
  ).toThrow("actual_token_budget_exceeded");
});

it.each([
  [
    "Require GDPR compliance and secure data handling",
    "segments.1.problems.0",
    "buyer-requirement",
  ],
  [
    "Looking for GDPR-compliant SaaS",
    "segments.1.buyingSignals.0",
    "buyer-requirement",
  ],
  [
    "Create GDPR-focused content",
    "acquisitionChannels.1.steps.0",
    "recommended-action",
  ],
  [
    "Use LinkedIn for initial trial offers",
    "acquisitionChannels.0.recommendation.text",
    "recommended-action",
  ],
  ["Reply rate >=5%", "thirtyDayPlan.0.successMetric", "experimental-target"],
  [
    "Agencies may need faster design delivery",
    "segments.1.evidence.text",
    "commercial-hypothesis",
  ],
  [
    "Does your team need GDPR compliance?",
    "outreachTemplates.0.body",
    "commercial-hypothesis",
  ],
] as const)("preserves a valid %s without filler", (text, path, kind) => {
  expect(statementKind(text, path, "Tally")).toBe(kind);
  expect(
    verifyClaims(text, [], [], {}, true, {
      productName: "Tally",
      pathPrefix: path,
    }).value,
  ).toBe(text);
});

it("does not classify the noun offers as a product capability", () => {
  const text = "Figma Community Posts and Offers";
  expect(verifyClaims({ title: text }, [], [], {}).value.title).toBe(text);
});

it("does not let an overbroad model claim label delete a buyer requirement or an experiment target", () => {
  for (const [path, claim] of [
    [
      "segments.1.problems.0",
      "Require GDPR compliance and secure data handling",
    ],
    [
      "thirtyDayPlan.0.successMetric",
      "Record replies; a 5% reply rate is a planning threshold, not a forecast",
    ],
  ]) {
    const review: ClaimReview = {
      path,
      claim,
      classification: "Unsupported",
      sourceUrl: null,
      quote: null,
      founderCapability: null,
    };
    const checked = verifyClaims(claim, [review], [], {}, true, {
      pathPrefix: path,
    });
    expect(checked.value).toBe(claim);
    expect(checked.actions[0].classification).toBe("Inferred or hypothetical");
  }
});

it("preserves an exact publisher-attributed promotional quote without treating it as independent proof", () => {
  const quote = "With Senja you'll collect twice as many testimonials.";
  const body = `According to the publisher, ${quote}`;
  const checked = verifyClaims(
    { body },
    [],
    [{ url: "https://senja.io/", content: quote }],
    {},
  );
  expect(checked.value.body).toBe(body);
  expect(checked.actions[0].classification).toBe("Website-supported");
  expect(
    verifyClaims(
      { body: quote },
      [],
      [{ url: "https://senja.io/", content: quote }],
      {},
    ).value.body,
  ).toBe("");
});

it.each([
  "If you're looking for secure GDPR-compliant forms, Tally offers encrypted forms hosted in Europe.",
  "If security matters, our product is GDPR-compliant.",
  "Our product reduces admin time by 50%.",
  "Our product integrates with Salesforce.",
  "Hi [name], I noticed your team uses Jira/Linear and Figma for product design.",
])("does not exempt the factual/prospect assertion: %s", (text) => {
  const result = verifyClaims({ body: text }, [], [], {}, true, {
    productName: "Tally",
  });
  expect(result.actions.some((a) => a.action === "removed")).toBe(true);
  expect(result.value.body).not.toContain(text);
});

it("requires separate trustworthy evidence for independent verification, and keeps owner claims attributed", () => {
  const claim = "The product is ISO 27001 certified.";
  const evidence = [{ url: "https://owner.example/", content: claim }];
  const review: ClaimReview = {
    path: "body",
    claim,
    classification: "Independently verified",
    sourceUrl: evidence[0].url,
    quote: claim,
    founderCapability: null,
  };
  expect(verifyClaims({ body: claim }, [review], evidence, {}).value.body).toBe(
    "",
  );
  expect(
    verifyClaims({ body: claim }, [review], [], {}, true, {
      independentEvidence: evidence,
    }).value.body,
  ).toBe(claim);
  const attributed = `According to the publisher, ${claim}`;
  expect(
    verifyClaims(
      { body: attributed },
      [{ ...review, classification: "Website-supported" }],
      evidence,
      {},
    ).value.body,
  ).toBe(attributed);
  expect(
    verifyClaims(
      { body: claim },
      [
        {
          ...review,
          classification: "Founder-confirmed",
          founderCapability: claim,
        },
      ],
      [],
      { confirmedCapabilities: [claim] },
    ).value.body,
  ).toBe("");
});

it.each(sites)(
  "rejects recorded %s numeric goals/missing experiment contracts without erasing target text",
  (slug) => {
    const candidate = load(slug, "first-candidate.json");
    const issues = deterministicQuality(candidate, { requireExperiment: true });
    expect(issues.some((i) => /numeric outcome benchmark/.test(i.reason))).toBe(
      true,
    );
    expect(issues.some((i) => i.section === "firstExperiment")).toBe(true);
    const snapshot = JSON.stringify(candidate);
    safeInitialReport(candidate, []);
    expect(JSON.stringify(candidate)).toBe(snapshot);
  },
);

it("captures known failures before review and never buys a rereview for an unchanged defective patch", async () => {
  const candidate = reportV11Schema.parse(
    load("greensighter", "first-candidate.json"),
  );
  const issues = deterministicQuality(candidate);
  const sections = [...new Set(issues.map((i) => i.section))];
  const call = vi
    .fn()
    .mockResolvedValue(
      Object.fromEntries(
        sections.map((s) => [s, candidate[s as keyof typeof candidate]]),
      ),
    );
  await expect(
    qualityGate({
      candidate,
      fields,
      product: candidate.productIntelligence,
      context: {},
      call,
      validate: (v) => reportV11Schema.parse(v),
      claimIssues: () => [],
    }),
  ).rejects.toMatchObject({
    message: "quality_repair_invalid",
    repairFeasible: false,
    issues: expect.any(Array),
  });
  expect(call.mock.calls.map((c) => c[1])).toEqual(["quality_repair"]);
});

it("retains semantic rejection of the actual contradictory FirstCustomers plan", async () => {
  const candidate = load("firstcustomers", "first-candidate.json");
  expect(candidate.firstTenPlaybook[2].recommendation.text).toContain(
    "moderately successful",
  );
  expect(candidate.thirtyDayPlan[3].objective).toContain("success is limited");
  const review = structuredClone(passingReview);
  review.scores.consistency = 0;
  review.issues = [
    {
      section: "thirtyDayPlan",
      reason:
        "Webinar triggered by limited content results while playbook requires moderately successful content",
    },
  ];
  expect(reviewIssues(review)).toEqual(review.issues);
  // This tests rejection of an identified semantic defect, not model accuracy.
});

it("requires complete structured experiment semantics and keeps old genuine evidence immutable", () => {
  expect(
    firstExperimentSchema.safeParse({ segment: "SMBs", channel: "Cold email" })
      .success,
  ).toBe(false);
  const manifest = JSON.parse(
    readFileSync(`${root}/evidence-sha256.json`, "utf8"),
  );
  for (const [file, hash] of Object.entries(manifest))
    expect(
      createHash("sha256")
        .update(readFileSync(`${root}/${file.split("\\").join("/")}`))
        .digest("hex"),
    ).toBe(hash);
});
