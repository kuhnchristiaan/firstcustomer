import { it, expect } from "vitest";
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Responses } from "openai/resources/responses/responses";
import { zodTextFormat } from "openai/helpers/zod";
import { config } from "@/modules/config/env";
import { crawl, type Source } from "@/modules/website/extract";
import { provider, ProviderOutputError } from "@/modules/analysis/provider";
import {
  hydrateProductProfile,
  validateBasis,
  basisSchema,
} from "@/modules/intelligence/product-profile";
import {
  groundReport,
  generationProductContext,
} from "@/modules/intelligence/attribution";
import { reportV1Schema, reportV11Schema } from "@/modules/intelligence/schema";
import {
  deterministicQuality,
  qualityReviewSchema,
  reviewIssues,
  reviewInstructions,
} from "@/modules/intelligence/quality";
import { safeInitialReport } from "@/modules/strategy/claims";
import { productEvidence } from "@/modules/website/document";

// Opt-in, real SDK transport. No fixtures, fake responses, DB or application API.
// Receipts are exclusive-create and survive failure: an analysis cannot rerun.
const sites = [
  { slug: "senja", url: "https://senja.io/" },
  { slug: "greensighter", url: "https://ai.greensighter.com/" },
  { slug: "firstcustomers", url: "https://www.firstcustomers.app/" },
  { slug: "tally", url: "https://tally.so/" },
];
const root = resolve("docs/milestone-6-live-2026-11-05");
type Stage = {
  stage: string;
  startedAt: string;
  elapsedMs?: number;
  requestBytes: number;
  maxOutputTokens: number;
  input: unknown;
  status?: string;
  model?: string;
  responseId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  estimatedCostUsd?: number;
  uncachedCostUsd?: number;
  incompleteDetails?: unknown;
  outputText?: string;
  output?: unknown;
  error?: { name: string; status: number | null; code: string | null };
};
function safeError(e: unknown) {
  const o = e as { name?: string; status?: number; code?: string };
  return {
    name: o?.name ?? "Error",
    status: typeof o?.status === "number" ? o.status : null,
    code: typeof o?.code === "string" ? o.code : null,
  };
}

it.skipIf(process.env.LIVE_M6_EVALUATION !== "true").each(sites)(
  "records one genuine initial analysis for $slug",
  async ({ slug, url }) => {
    loadEnv({ path: ".env.local", quiet: true });
    const e = config();
    expect(e.MOCK_ANALYSIS).toBe("false");
    expect(Boolean(e.OPENAI_API_KEY)).toBe(true);
    // Pricing is verified for this configured model; never silently substitute.
    expect(e.OPENAI_MODEL).toBe("gpt-4.1-mini");
    const directory = resolve(root, slug);
    await mkdir(directory, { recursive: true });
    const started = Date.now();
    const startedAt = new Date().toISOString();
    const implementationHashes = Object.fromEntries(
      await Promise.all(
        [
          "src/modules/analysis/provider.ts",
          "src/modules/intelligence/quality.ts",
          "src/modules/strategy/claims.ts",
          "src/modules/intelligence/schema.ts",
        ].map(async (file) => [
          file,
          createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
        ]),
      ),
    );
    await writeFile(
      resolve(directory, "attempt.json"),
      JSON.stringify(
        {
          startedAt,
          url,
          model: e.OPENAI_MODEL,
          analysisOrdinal: 1,
          maxWholeAnalysisAttempts: 1,
          limits: {
            inputTokens: e.MAX_INPUT_TOKENS,
            outputTokens: e.MAX_OUTPUT_TOKENS,
          },
          pricing: {
            inputUsdPerMillion: 0.4,
            cachedInputUsdPerMillion: 0.1,
            outputUsdPerMillion: 1.6,
            source:
              "https://developers.openai.com/api/docs/models/gpt-4.1-mini",
            verifiedDate: "2026-11-05",
          },
          implementationHashes,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    const stages: Stage[] = [];
    const original = Responses.prototype.create;
    // A pass-through observer: every response is obtained by calling the saved
    // original SDK method with the provider's exact body/options/client.
    Responses.prototype.create = function (this: Responses, body, options) {
      if (stages.length >= 5)
        throw new Error("Live evaluation stage ceiling exceeded");
      const stage: Stage = {
        stage:
          body.text?.format?.type === "json_schema"
            ? body.text.format.name
            : "unknown",
        startedAt: new Date().toISOString(),
        requestBytes: Buffer.byteLength(JSON.stringify(body)),
        maxOutputTokens: body.max_output_tokens ?? 0,
        input: body.input,
      };
      stages.push(stage);
      const callStarted = Date.now();
      return (async () => {
        try {
          const result = await original.call(this, body, options);
          if (!("status" in result))
            throw new Error("Unexpected streaming response");
          const i = result.usage?.input_tokens ?? 0,
            o = result.usage?.output_tokens ?? 0;
          const cached = result.usage?.input_tokens_details?.cached_tokens ?? 0;
          Object.assign(stage, {
            elapsedMs: Date.now() - callStarted,
            status: result.status,
            model: result.model,
            responseId: result.id,
            inputTokens: i,
            outputTokens: o,
            cachedInputTokens: cached,
            estimatedCostUsd:
              ((i - cached) * 0.4 + cached * 0.1 + o * 1.6) / 1e6,
            uncachedCostUsd: (i * 0.4 + o * 1.6) / 1e6,
            incompleteDetails: result.incomplete_details,
            outputText: result.output_text,
          });
          try {
            stage.output = JSON.parse(result.output_text);
          } catch {
            /* Raw incomplete output retained. */
          }
          await writeFile(
            resolve(directory, "stages.json"),
            JSON.stringify(stages, null, 2),
          );
          return result;
        } catch (error) {
          stage.elapsedMs = Date.now() - callStarted;
          stage.error = safeError(error);
          await writeFile(
            resolve(directory, "stages.json"),
            JSON.stringify(stages, null, 2),
          );
          throw error;
        }
      })() as ReturnType<typeof original>;
    } as typeof original;
    let sources: Source[] = [];
    let acceptedReport: unknown = null;
    let failure: unknown = null;
    let crawlMs = 0;
    try {
      const signal = AbortSignal.timeout(125000);
      sources = await crawl(
        url,
        e.MAX_PAGES,
        Math.min(
          e.MAX_CONTENT_CHARS,
          Math.floor((e.MAX_INPUT_TOKENS - 3500) / 4),
        ),
        signal,
      );
      crawlMs = Date.now() - started;
      await writeFile(
        resolve(directory, "sources.json"),
        JSON.stringify(sources, null, 2),
      );
      const result = await provider().analyze(sources, signal);
      acceptedReport = result.report;
      await writeFile(
        resolve(directory, "accepted-report.json"),
        JSON.stringify(result.report, null, 2),
      );
    } catch (error) {
      failure = {
        ...safeError(error),
        reason:
          error instanceof ProviderOutputError
            ? error.reason
            : "crawl_or_configuration_failure",
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
    // Read-only reconstruction of the SAME actual model outputs, solely to
    // inspect rejected candidates. Never calls provider or requests new text.
    let firstCandidate: ReturnType<typeof reportV11Schema.parse> | null = null;
    let finalCandidate: ReturnType<typeof reportV11Schema.parse> | null = null;
    let candidateDiagnostics: Record<string, unknown> = {};
    const generated = stages.find((s) => s.stage === "business_intelligence");
    try {
      const selection = stages.find(
        (s) => s.stage === "attributed_product_profile",
      )?.output;
      const profile = hydrateProductProfile(selection, sources);
      const raw = generated?.output as { recommendationBasis?: unknown };
      validateBasis(basisSchema.parse(raw?.recommendationBasis), profile);
      firstCandidate = reportV11Schema.parse({
        ...groundReport(reportV1Schema.parse(raw), profile, true),
        schemaVersion: "1.1",
        productIntelligence: profile,
        recommendationBasis: raw.recommendationBasis,
      });
      finalCandidate = firstCandidate;
      const diagnostics = (r: ReturnType<typeof reportV11Schema.parse>) => {
        const clean = safeInitialReport(r, productEvidence(sources));
        return {
          deterministic: deterministicQuality(r),
          claimSectionsChangedBySanitiser: Object.keys(r).filter(
            (k) =>
              JSON.stringify(r[k as keyof typeof r]) !==
              JSON.stringify(clean[k as keyof typeof clean]),
          ),
        };
      };
      candidateDiagnostics = { first: diagnostics(firstCandidate) };
      const patch = stages.find((s) => s.stage === "quality_repair")?.output;
      if (patch)
        finalCandidate = reportV11Schema.parse({
          ...firstCandidate,
          ...(patch as object),
        });
      Object.assign(candidateDiagnostics, {
        final: diagnostics(finalCandidate),
      });
      await writeFile(
        resolve(directory, "first-candidate.json"),
        JSON.stringify(firstCandidate, null, 2),
      );
      await writeFile(
        resolve(directory, "final-candidate.json"),
        JSON.stringify(finalCandidate, null, 2),
      );
    } catch (error) {
      candidateDiagnostics = {
        reconstruction:
          "No complete valid candidate could be reconstructed from the actual responses",
        error: safeError(error),
      };
    }
    const reviews = stages
      .filter((s) => s.stage === "quality_review")
      .map((s) => {
        const parsed = qualityReviewSchema.safeParse(s.output);
        if (!parsed.success) return { complete: false, status: s.status };
        try {
          return {
            complete: true,
            ...parsed.data,
            blockingIssues: reviewIssues(parsed.data),
          };
        } catch {
          return { complete: true, ...parsed.data, inconsistentReview: true };
        }
      });
    const summary = {
      url,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs,
      crawlMs,
      model: e.OPENAI_MODEL,
      limits: {
        inputTokens: e.MAX_INPUT_TOKENS,
        outputTokens: e.MAX_OUTPUT_TOKENS,
      },
      analysisAttempts: 1,
      pages: sources.length,
      analysisSucceeded: acceptedReport !== null,
      finalAccepted: acceptedReport !== null,
      firstCandidateAvailable: firstCandidate !== null,
      repairAttempted: stages.some((s) => s.stage === "quality_repair"),
      firstCandidatePassed:
        acceptedReport !== null &&
        !stages.some((s) => s.stage === "quality_repair"),
      // False here means "not accepted", not necessarily "review judged poor".
      reviews,
      candidateDiagnostics,
      failure,
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
        uncachedCostUsd: stages.reduce(
          (n, s) => n + (s.uncachedCostUsd ?? 0),
          0,
        ),
      },
      stages: stages.map(
        ({ input: _input, output: _output, outputText: _text, ...s }) => {
          void _input;
          void _output;
          void _text;
          return s;
        },
      ),
    };
    await writeFile(
      resolve(directory, "result.json"),
      JSON.stringify(summary, null, 2),
    );
    expect(stages.length).toBeLessThanOrEqual(5);
    expect(
      stages.filter((s) => s.stage === "business_intelligence").length,
    ).toBeLessThanOrEqual(1);
    expect(
      stages.filter((s) => s.stage === "quality_repair").length,
    ).toBeLessThanOrEqual(1);
  },
  140000,
);

// Explicitly offline: reconstruct the next request from recorded data to explain
// preflight failures and render the complete genuine candidate for review.
it.skipIf(process.env.M6_OFFLINE_ARTIFACTS !== "true").each(sites)(
  "renders and diagnoses recorded $slug output without any model calls",
  async ({ slug }) => {
    const directory = resolve(root, slug);
    const result = JSON.parse(
      await readFile(resolve(directory, "result.json"), "utf8"),
    );
    const candidate = reportV11Schema.parse(
      JSON.parse(
        await readFile(resolve(directory, "first-candidate.json"), "utf8"),
      ),
    );
    const sources = JSON.parse(
      await readFile(resolve(directory, "sources.json"), "utf8"),
    ) as Source[];
    const { schemaVersion, businessName, overview, offerings, ...fields } =
      reportV1Schema.shape;
    void schemaVersion;
    void businessName;
    void overview;
    void offerings;
    const data = {
      product: generationProductContext(candidate.productIntelligence),
      founder: { status: "Not supplied", budget: "Unknown", time: "Unknown" },
      report: Object.fromEntries(
        Object.keys(fields).map((k) => [
          k,
          candidate[k as keyof typeof candidate],
        ]),
      ),
    };
    const request = {
      model: result.model,
      max_output_tokens: Math.min(
        650,
        result.limits.outputTokens - result.usage.outputTokens,
      ),
      input: [
        { role: "system", content: reviewInstructions },
        { role: "user", content: JSON.stringify(data) },
      ],
      text: { format: zodTextFormat(qualityReviewSchema, "quality_review") },
    };
    const requestBytes = Buffer.byteLength(JSON.stringify(request), "utf8");
    const inputReservation = result.usage.inputTokens + requestBytes + 1024;
    const clean = safeInitialReport(candidate, productEvidence(sources));
    const differences: {
      path: string;
      original: unknown;
      sanitised: unknown;
    }[] = [];
    const compare = (a: unknown, b: unknown, path: string) => {
      if (JSON.stringify(a) === JSON.stringify(b)) return;
      if (a && b && typeof a === "object" && typeof b === "object") {
        for (const k of Object.keys(a))
          compare(
            (a as Record<string, unknown>)[k],
            (b as Record<string, unknown>)[k],
            path ? `${path}.${k}` : k,
          );
      } else differences.push({ path, original: a, sanitised: b });
    };
    compare(candidate, clean, "");
    const diagnostic = {
      mode: "offline reconstruction, zero API calls; original artifacts unchanged",
      qualityReviewWasCalled: result.stages.some(
        (s: Stage) => s.stage === "quality_review",
      ),
      pendingQualityReview: {
        requestBytes,
        overheadReservation: 1024,
        alreadyBilledInputTokens: result.usage.inputTokens,
        totalInputReservation: inputReservation,
        inputCap: result.limits.inputTokens,
        overInputCapBy: Math.max(
          0,
          inputReservation - result.limits.inputTokens,
        ),
        requestedOutputTokens: request.max_output_tokens,
        remainingOutputTokens:
          result.limits.outputTokens - result.usage.outputTokens,
      },
      deterministicIssues: deterministicQuality(candidate),
      sanitiserDifferences: differences,
      oldFallbackSentenceOccurrences:
        JSON.stringify(candidate).split(
          "Ask the buyer about their current workflow and validate the relevant product capabilities before making a claim.",
        ).length - 1,
    };
    await writeFile(
      resolve(directory, "offline-validation.json"),
      JSON.stringify(diagnostic, null, 2),
    );
    const sections = Object.entries(candidate)
      .map(
        ([key, value]) =>
          `## ${key}\n\n${typeof value === "string" ? value : "```json\n" + JSON.stringify(value, null, 2) + "\n```"}\n`,
      )
      .join("\n");
    await writeFile(
      resolve(directory, "candidate-report.md"),
      `# ${candidate.businessName}: genuine model candidate\n\n**Rejected by the application; never published.** This is a readable copy of the complete recorded candidate, not a manually authored replacement. No repair occurred. Owner quotations describe publisher claims, not independent verification.\n\n${sections}`,
    );
    expect(diagnostic.qualityReviewWasCalled).toBe(false);
    expect(inputReservation).toBeGreaterThan(result.limits.inputTokens);
    expect(request.max_output_tokens).toBe(650);
  },
);
