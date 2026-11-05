import { it, expect, beforeAll, afterAll } from "vitest";
import { config as loadEnv } from "dotenv";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Responses } from "openai/resources/responses/responses";
import { config } from "@/modules/config/env";
import { crawl, type Source } from "@/modules/website/extract";
import { provider, ProviderOutputError } from "@/modules/analysis/provider";
import {
  hydrateProductProfile,
  basisSchema,
  validateBasis,
} from "@/modules/intelligence/product-profile";
import { groundReport } from "@/modules/intelligence/attribution";
import {
  reportV1Schema,
  reportV11Schema,
  validateEvidence,
} from "@/modules/intelligence/schema";
import {
  deterministicQuality,
  qualityReviewSchema,
  reviewIssues,
} from "@/modules/intelligence/quality";
import { safeInitialReport } from "@/modules/strategy/claims";
import { productEvidence } from "@/modules/website/document";

// Evaluation harness only. The application, model, environment files, thresholds
// and pipeline are frozen. No DB/service mutation path is imported or invoked.
const enabled = process.env.LIVE_M62_EVALUATION === "true";
const root = resolve("docs/milestone-6-2-live-2026-11-05");
const sites = [
  { slug: "senja", url: "https://senja.io/" },
  { slug: "greensighter", url: "https://ai.greensighter.com/" },
  { slug: "firstcustomers", url: "https://www.firstcustomers.app/" },
  { slug: "tally", url: "https://tally.so/" },
];
const sha = (s: Uint8Array) => createHash("sha256").update(s).digest("hex");
let frozen: Record<string, string> = {};
let privateEnvHashes: Record<string, string> = {};
let spent = 0,
  uncertainReserved = 0,
  stopped = false;
type Stage = {
  stage: string;
  request: unknown;
  requestBytes: number;
  maxOutputTokens: number;
  startedAt: string;
  elapsedMs?: number;
  status?: string;
  model?: string;
  responseId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  estimatedCostUsd?: number;
  usage?: unknown;
  incompleteDetails?: unknown;
  outputText?: string;
  output?: unknown;
  error?: { name: string; status: number | null; code: string | null };
  conservativeCostReservation: number;
};
async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? files(`${directory}/${e.name}`)
          : [`${directory}/${e.name}`],
      ),
    )
  ).flat();
}
async function snapshot(paths: string[]) {
  return Object.fromEntries(
    await Promise.all(paths.map(async (f) => [f, sha(await readFile(f))])),
  );
}
function safeError(e: unknown) {
  const v = e as { name?: string; status?: number; code?: string };
  return {
    name: v?.name ?? "Error",
    status: typeof v?.status === "number" ? v.status : null,
    code: typeof v?.code === "string" ? v.code : null,
  };
}
async function ledger() {
  await writeFile(
    resolve(root, "spend-ledger.json"),
    JSON.stringify(
      {
        actualKnownCostUsd: spent,
        uncertainReservedCostUsd: uncertainReserved,
        ceilingUsd: 0.2,
        stopped,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
beforeAll(async () => {
  if (!enabled) return;
  loadEnv({ path: ".env.local", quiet: true });
  const e = config();
  expect(e.MOCK_ANALYSIS).toBe("false");
  expect(e.OPENAI_MODEL).toBe("gpt-4.1-mini");
  expect(Boolean(e.OPENAI_API_KEY)).toBe(true);
  const applicationFiles = [
    ...(await files("src")),
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "prisma/schema.prisma",
    "src/modules/config/env.ts",
  ];
  frozen = await snapshot([...new Set(applicationFiles)].sort());
  privateEnvHashes = await snapshot(
    (await readdir(".")).filter((f) => /^\.env(?:\.|$)/.test(f)),
  );
  await mkdir(root, { recursive: true });
  await writeFile(
    resolve(root, "frozen-application.json"),
    JSON.stringify(
      { capturedAt: new Date().toISOString(), files: frozen },
      null,
      2,
    ),
    { flag: "wx" },
  );
  await ledger();
});
afterAll(async () => {
  if (!enabled) return;
  const codeUnchanged =
    JSON.stringify(await snapshot(Object.keys(frozen))) ===
    JSON.stringify(frozen);
  const environmentFilesUnchanged =
    JSON.stringify(await snapshot(Object.keys(privateEnvHashes))) ===
    JSON.stringify(privateEnvHashes);
  await writeFile(
    resolve(root, "integrity.json"),
    JSON.stringify(
      {
        codeUnchanged,
        environmentFilesUnchanged,
        thresholdsUnchanged: codeUnchanged,
        modelConfigurationUnchanged: environmentFilesUnchanged,
      },
      null,
      2,
    ),
  );
  expect(codeUnchanged).toBe(true);
  expect(environmentFilesUnchanged).toBe(true);
});

it.skipIf(!enabled).each(sites)(
  "records one frozen-pipeline Milestone 6.2 analysis for $slug",
  async ({ slug, url }) => {
    if (stopped)
      throw new Error(
        "Evaluation stopped at the expenditure guard; no further analyses permitted",
      );
    const e = config();
    const mode = process.env.M62_MATRIX ?? "lower4500";
    expect(["lower4500", "mixed", "configured"]).toContain(mode);
    const lower =
      mode === "lower4500" ||
      (mode === "mixed" && ["senja", "greensighter"].includes(slug));
    // Existing production-default per-request configuration via the provider's
    // supported limits argument; no settings file or application limit is edited.
    const limits = {
      inputTokens: e.MAX_INPUT_TOKENS,
      outputTokens: lower ? 4500 : e.MAX_OUTPUT_TOKENS,
    };
    expect(limits.outputTokens).toBeLessThanOrEqual(e.MAX_OUTPUT_TOKENS);
    const maxAnalysisCost =
      (limits.inputTokens * 0.4 + limits.outputTokens * 1.6) / 1e6;
    if (spent + uncertainReserved + maxAnalysisCost >= 0.2) {
      stopped = true;
      await ledger();
      throw new Error("Cannot reserve another complete analysis below US$0.20");
    }
    expect(JSON.stringify(await snapshot(Object.keys(frozen)))).toBe(
      JSON.stringify(frozen),
    );
    const directory = resolve(root, slug);
    await mkdir(directory, { recursive: true });
    const startedAt = new Date().toISOString(),
      started = Date.now();
    await writeFile(
      resolve(directory, "attempt.json"),
      JSON.stringify(
        {
          startedAt,
          url,
          analysisOrdinal: 1,
          maxWholeAnalysisAttempts: 1,
          model: e.OPENAI_MODEL,
          configuredLimits: {
            inputTokens: e.MAX_INPUT_TOKENS,
            outputTokens: e.MAX_OUTPUT_TOKENS,
          },
          testedLimits: limits,
          matrix: mode,
          pricing: {
            inputUsdPerMillion: 0.4,
            cachedInputUsdPerMillion: 0.1,
            outputUsdPerMillion: 1.6,
            source:
              "https://developers.openai.com/api/docs/models/gpt-4.1-mini",
            verifiedDate: "2026-11-05",
          },
          aggregateCostUpperBoundUsd: maxAnalysisCost,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    const stages: Stage[] = [];
    const original = Responses.prototype.create;
    Responses.prototype.create = function (this: Responses, body, options) {
      const name =
        body.text?.format?.type === "json_schema"
          ? body.text.format.name
          : "unknown";
      if (
        ![
          "attributed_product_profile",
          "business_intelligence",
          "quality_repair",
          "quality_review",
        ].includes(name) ||
        stages.length >= 5 ||
        ([
          "attributed_product_profile",
          "business_intelligence",
          "quality_repair",
        ].includes(name) &&
          stages.some((s) => s.stage === name))
      )
        throw new Error(
          "Evaluation stage/attempt guard rejected an extra call",
        );
      const bytes = Buffer.byteLength(JSON.stringify(body), "utf8");
      // Cost guard only: an intentionally conservative one-token-per-byte bound
      // plus all requested output. It never relaxes the application's preflight.
      const reserve =
        ((bytes + 1024) * 0.4 + (body.max_output_tokens ?? 0) * 1.6) / 1e6;
      if (spent + uncertainReserved + reserve >= 0.2) {
        stopped = true;
        throw new Error("US$0.20 expenditure guard");
      }
      const stage: Stage = {
        stage: name,
        request: body,
        requestBytes: bytes,
        maxOutputTokens: body.max_output_tokens ?? 0,
        startedAt: new Date().toISOString(),
        conservativeCostReservation: reserve,
      };
      stages.push(stage);
      uncertainReserved += reserve;
      const began = Date.now();
      return (async () => {
        await ledger();
        try {
          // Pass-through observation only: genuine SDK request, no fake responses.
          const response = await original.call(this, body, options);
          if (!("status" in response))
            throw new Error("Unexpected streaming response");
          const i = response.usage?.input_tokens,
            o = response.usage?.output_tokens,
            cached = response.usage?.input_tokens_details?.cached_tokens ?? 0;
          const cost =
            i !== undefined && o !== undefined
              ? ((i - cached) * 0.4 + cached * 0.1 + o * 1.6) / 1e6
              : undefined;
          if (cost !== undefined) {
            uncertainReserved -= reserve;
            spent += cost;
          } else stopped = true;
          Object.assign(stage, {
            elapsedMs: Date.now() - began,
            status: response.status,
            model: response.model,
            responseId: response.id,
            inputTokens: i,
            outputTokens: o,
            cachedInputTokens: cached,
            estimatedCostUsd: cost,
            usage: response.usage,
            incompleteDetails: response.incomplete_details,
            outputText: response.output_text,
          });
          try {
            stage.output = JSON.parse(response.output_text);
          } catch {
            /* Retain raw truncated/refusal output. */
          }
          await writeFile(
            resolve(directory, "stages.json"),
            JSON.stringify(stages, null, 2),
          );
          await ledger();
          return response;
        } catch (error) {
          stage.elapsedMs = Date.now() - began;
          stage.error = safeError(error);
          stopped = true; // Unknown billing/failure: stop rather than retry.
          await writeFile(
            resolve(directory, "stages.json"),
            JSON.stringify(stages, null, 2),
          );
          await ledger();
          throw error;
        }
      })() as ReturnType<typeof original>;
    } as typeof original;
    let sources: Source[] = [],
      accepted: unknown = null,
      failure: unknown = null,
      crawlMs = 0;
    try {
      const signal = AbortSignal.timeout(125000);
      sources = await crawl(
        url,
        e.MAX_PAGES,
        Math.min(
          e.MAX_CONTENT_CHARS,
          Math.floor((limits.inputTokens - 3500) / 4),
        ),
        signal,
      );
      crawlMs = Date.now() - started;
      await writeFile(
        resolve(directory, "sources.json"),
        JSON.stringify(sources, null, 2),
      );
      accepted = (await provider().analyze(sources, signal, limits)).report;
      await writeFile(
        resolve(directory, "accepted-report.json"),
        JSON.stringify(accepted, null, 2),
      );
    } catch (error) {
      failure = {
        ...safeError(error),
        reason:
          error instanceof ProviderOutputError
            ? error.reason
            : "crawl_or_provider_failure",
        qualityFailure:
          error instanceof ProviderOutputError
            ? error.qualityFailure
            : undefined,
        providerUsage:
          error instanceof ProviderOutputError
            ? {
                inputTokens: error.inputTokens,
                outputTokens: error.outputTokens,
                stages: error.stages,
              }
            : null,
      };
    } finally {
      Responses.prototype.create = original;
    }
    const elapsedMs = Date.now() - started;
    let productProfile: unknown = null,
      first: ReturnType<typeof reportV11Schema.parse> | null = null,
    last: ReturnType<typeof reportV11Schema.parse> | null = null;
    const inspect = (r: ReturnType<typeof reportV11Schema.parse>) => {
      const clean = safeInitialReport(r, productEvidence(sources));
      return {
        deterministicIssues: deterministicQuality(r),
        claimIssues: [...Object.keys(reportV1Schema.shape), "firstExperiment"]
          .filter(
            (k) =>
              JSON.stringify(r[k as keyof typeof r]) !==
              JSON.stringify(clean[k as keyof typeof clean]),
          )
          .map((section) => ({
            section,
            reason:
              "Unsupported factual assertion; rewrite this section without losing its intended purpose",
          })),
      };
    };
    let firstChecks: unknown = null,
      finalChecks: unknown = null,
      reconstruction: unknown = null;
    try {
      const rawProfile = stages.find(
        (s) => s.stage === "attributed_product_profile",
      )?.output;
      productProfile = hydrateProductProfile(rawProfile, sources);
      await writeFile(
        resolve(directory, "product-profile.json"),
        JSON.stringify(productProfile, null, 2),
      );
      const raw = stages.find((s) => s.stage === "business_intelligence")
        ?.output as {
        firstExperiment?: unknown;
        recommendationBasis?: unknown;
      };
      if (raw)
        await writeFile(
          resolve(directory, "initial-generated.json"),
          JSON.stringify(raw, null, 2),
        );
      validateBasis(
        basisSchema.parse(raw?.recommendationBasis),
        productProfile as Parameters<typeof validateBasis>[1],
      );
      first = reportV11Schema.parse({
        ...groundReport(
          reportV1Schema.parse(raw),
          productProfile as Parameters<typeof groundReport>[1],
          true,
        ),
        schemaVersion: "1.1",
        productIntelligence: productProfile,
        recommendationBasis: raw.recommendationBasis,
        firstExperiment: raw.firstExperiment,
      });
      validateEvidence(
        first,
        sources.map((s) => s.url),
      );
      last = first;
      firstChecks = inspect(first);
      await writeFile(
        resolve(directory, "first-candidate.json"),
        JSON.stringify(first, null, 2),
      );
      const patch = stages.find((s) => s.stage === "quality_repair")?.output;
      if (patch) {
        await writeFile(
          resolve(directory, "repair-output.json"),
          JSON.stringify(patch, null, 2),
        );
        last = reportV11Schema.parse({ ...first, ...(patch as object) });
        validateEvidence(
          last,
          sources.map((s) => s.url),
        );
      }
      finalChecks = inspect(last!);
      await writeFile(
        resolve(directory, "final-candidate.json"),
        JSON.stringify(accepted ?? last, null, 2),
      );
    } catch (error) {
      reconstruction = {
        ...safeError(error),
        schemaIssues:
          error && typeof error === "object" && "issues" in error
            ? (error.issues as { path: unknown[]; code: string }[]).map(
                (i) => ({ path: i.path, code: i.code }),
              )
            : null,
      };
    }
    const reviews = stages
      .filter((s) => s.stage === "quality_review")
      .map((s) => {
        const r = qualityReviewSchema.safeParse(s.output);
        if (!r.success) return { valid: false, status: s.status, scores: null };
        try {
          const issues = reviewIssues(r.data);
          return {
            valid: s.status === "completed",
            scores: r.data.scores,
            issues,
            passed: s.status === "completed" && !issues.length,
          };
        } catch {
          return {
            valid: false,
            scores: r.data.scores,
            issues: r.data.issues,
            passed: false,
          };
        }
      });
    const result = {
      url,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs,
      crawlMs,
      model: e.OPENAI_MODEL,
      testedLimits: limits,
      configuredLimits: {
        inputTokens: e.MAX_INPUT_TOKENS,
        outputTokens: e.MAX_OUTPUT_TOKENS,
      },
      matrix: mode,
      analysisAttempts: 1,
      pages: sources.length,
      analysisSucceeded: accepted !== null,
      finalAccepted: accepted !== null,
      productProfileAvailable: productProfile !== null,
      firstCandidateAvailable: first !== null,
      firstChecks,
      finalChecks,
      repairAttempted: stages.some((s) => s.stage === "quality_repair"),
      repairSuccessful:
        accepted !== null && stages.some((s) => s.stage === "quality_repair"),
      semanticReviewExecuted: reviews.length > 0,
      reviews,
      failure,
      reconstruction,
      usage: {
        inputTokens: stages.reduce((n, s) => n + (s.inputTokens ?? 0), 0),
        outputTokens: stages.reduce((n, s) => n + (s.outputTokens ?? 0), 0),
        cachedInputTokens: stages.reduce(
          (n, s) => n + (s.cachedInputTokens ?? 0),
          0,
        ),
        estimatedCostUsd: stages.reduce(
          (n, s) => n + (s.estimatedCostUsd ?? 0),
          0,
        ),
      },
      stages: stages.map(
        ({ request: _r, output: _o, outputText: _t, ...s }) => {
          void _r;
          void _o;
          void _t;
          return s;
        },
      ),
    };
    await writeFile(
      resolve(directory, "result.json"),
      JSON.stringify(result, null, 2),
    );
    expect(
      stages.filter((s) => s.stage === "business_intelligence").length,
    ).toBeLessThanOrEqual(1);
    expect(
      stages.filter((s) => s.stage === "quality_repair").length,
    ).toBeLessThanOrEqual(1);
    expect(spent + uncertainReserved).toBeLessThan(0.2);
  },
  140000,
);
