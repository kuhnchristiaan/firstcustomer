import { it, expect } from "vitest";
import OpenAI from "openai";
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  legacyAcquisitionSchema as acquisitionSchema,
  legacyAcquisitionInstructions as acquisitionInstructions,
} from "@/modules/intelligence/acquisition-legacy";
import { assembleLegacyAcquisition as assembleAcquisition } from "@/modules/intelligence/acquisition-legacy-assembly";
import { validateProductProfile } from "@/modules/intelligence/product-profile";
import { generationProductContext } from "@/modules/intelligence/attribution";
import { analysisRequest } from "@/modules/analysis/provider";
import { validateEvidence } from "@/modules/intelligence/schema";
import { deterministicQuality } from "@/modules/intelligence/quality";
import { crawl } from "@/modules/website/extract";

// Isolated evaluation only. No application persistence, model/config edits,
// repairs, reviews or full-analysis retries. All API failures are preserved.
const mode = process.env.MODEL_BENCHMARK_MODE;
const root = resolve("docs/model-intelligence-benchmark-2026-11-05");
const models = [
  {
    id: "gpt-4.1-mini",
    maxOutput: 6000,
    input: 0.4,
    cached: 0.1,
    output: 1.6,
    write: 0.4,
  },
  {
    id: "gpt-6.1-sol",
    maxOutput: 25000,
    input: 2,
    cached: 0.1,
    output: 10,
    write: 2.5,
  },
];
const sites = [
  { slug: "senja", url: "https://senja.io/" },
  { slug: "tally", url: "https://tally.so/" },
];
const sha = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
const read = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), "utf8"));
const save = async (path: string, value: unknown, exclusive = false) =>
  writeFile(
    resolve(root, path),
    JSON.stringify(value, null, 2),
    exclusive ? { flag: "wx" } : undefined,
  );
const client = () => {
  loadEnv({ path: [".env.local", ".env"], quiet: true });
  if (!process.env.OPENAI_API_KEY)
    throw new Error("Existing FirstCustomers API credential is unavailable");
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.openai.com/v1",
    maxRetries: 0,
    timeout: 240000,
  });
};
async function applicationSnapshot() {
  const files = execFileSync(
    "git",
    [
      "ls-files",
      "src",
      "package.json",
      "package-lock.json",
      "next.config.ts",
      "prisma",
      "tsconfig.json",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/);
  return Object.fromEntries(
    await Promise.all(files.map(async (f) => [f, sha(await readFile(f))])),
  );
}
async function envSnapshot() {
  return Promise.all(
    [".env.local", ".env"].map(async (p) => {
      try {
        return sha(await readFile(p));
      } catch {
        return null;
      }
    }),
  );
}
function readable(value: unknown, path = ""): string {
  if (!value || typeof value !== "object")
    return `**${path}**: ${String(value)}\n\n`;
  return Object.entries(value)
    .map(([k, v]) => readable(v, path ? `${path}.${k}` : k))
    .join("");
}

it.skipIf(mode !== "prepare")(
  "freezes shared evidence, model availability, attribution and requests without generating a strategy",
  async () => {
    await mkdir(root, { recursive: true });
    await mkdir(resolve(root, "blind"), { recursive: true });
    await mkdir(resolve(root, "unblinded"), { recursive: true });
    const api = client(),
      env = await envSnapshot(),
      frozen = await applicationSnapshot();
    await save(
      "preparation-started.json",
      {
        startedAt: new Date().toISOString(),
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
      },
      true,
    );
    const availability = [];
    for (const model of models) {
      try {
        const data = await api.models.retrieve(model.id);
        availability.push({
          requested: model.id,
          accessible: true,
          metadata: data,
        });
      } catch (error) {
        const e = error as { name: string; status?: number; code?: string };
        availability.push({
          requested: model.id,
          accessible: false,
          error: { name: e.name, status: e.status, code: e.code },
        });
      }
    }
    await save("model-availability.json", availability);
    // If either is inaccessible, do not spend on an unpaired benchmark.
    expect(availability.every((m) => m.accessible)).toBe(true);
    const packets = [];
    for (const site of sites) {
      const sources = await crawl(
        site.url,
        1,
        12000,
        AbortSignal.timeout(45000),
      );
      const historical = JSON.parse(
        await readFile(
          `docs/milestone-6-2-live-2026-11-05/${site.slug}/product-profile.json`,
          "utf8",
        ),
      );
      const profile = validateProductProfile(historical, sources);
      const data = {
        product: generationProductContext(profile),
        marketResearch: "Not performed",
        externalVerification: "Not performed",
        founderResources: "Unknown; use explicit conservative assumptions",
      };
      const ids = profile.statements
        .filter(
          (s) =>
            s.subject === "Owner product" &&
            ["Website observation", "Owner product claim"].includes(s.kind),
        )
        .map((s) => s.id) as [string, ...string[]];
      expect(ids.length).toBeGreaterThan(0);
      const request = analysisRequest(
        acquisitionSchema(ids),
        "acquisition_strategy",
        acquisitionInstructions,
        data,
        "MODEL",
        1,
      );
      const shared = { input: request.input, text: request.text };
      await save(`${site.slug}-sources.json`, sources, true);
      await save(`${site.slug}-profile.json`, profile, true);
      await save(`${site.slug}-shared-request.json`, shared, true);
      packets.push({
        ...site,
        sharedSha256: sha(JSON.stringify(shared)),
        evidenceSha256: sha(JSON.stringify(sources)),
        profileSha256: sha(JSON.stringify(profile)),
      });
    }
    const cells = sites.flatMap((site) =>
      models.map((model) => ({
        site: site.slug,
        model: model.id,
        label: `sample-${randomUUID().slice(0, 8)}`,
      })),
    );
    for (let i = cells.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    await save("unblinded/mapping.json", cells, true);
    const projected = [];
    for (const cell of cells) {
      const model = models.find((m) => m.id === cell.model)!;
      const shared = await read(`${cell.site}-shared-request.json`);
      const request = {
        ...shared,
        model: model.id,
        max_output_tokens: model.maxOutput,
        store: false,
        service_tier: "default",
        ...(model.id === "gpt-6.1-sol"
          ? { reasoning: { effort: "medium" } }
          : {}),
      };
      // For a conservative financial reservation, charge at the highest input or
      // cache-write rate for one token per UTF-8 byte plus framing. No cache discount.
      const reservedInput =
        Buffer.byteLength(JSON.stringify(request), "utf8") + 2048;
      const upperCost =
        (reservedInput * Math.max(model.input, model.write) +
          model.maxOutput * model.output) /
        1e6;
      projected.push({ label: cell.label, reservedInput, upperCost });
    }
    const totalUpper = projected.reduce((n, p) => n + p.upperCost, 0);
    await save("protocol.json", {
      date: "2026-11-05",
      models,
      packets,
      maxStrategyCalls: 4,
      spendCeilingUsd: 0.75,
      worstCaseUsd: totalUpper,
      reservations: projected,
      retries: 0,
      visibleInstructionsIdentical: true,
      sharedAttribution:
        "Existing genuine 6.2 owner profile, revalidated against the fresh homepage snapshot; no paid identification calls",
      semanticReviewCalls: 0,
      repairs: 0,
    });
    expect(totalUpper).toBeLessThan(0.75);
    await save("frozen-application.json", frozen, true);
    expect(await envSnapshot()).toEqual(env);
    expect(await applicationSnapshot()).toEqual(frozen);
    await save(
      "ledger.json",
      { spentUsd: 0, uncertainReservedUsd: 0, calls: 0, ceilingUsd: 0.75 },
      true,
    );
  },
  120000,
);

it.skipIf(mode !== "live")(
  "runs exactly four first-attempt strategies, preserving failures without repair or retry",
  async () => {
    const api = client(),
      env = await envSnapshot(),
      frozen = await read("frozen-application.json");
    const protocol = await read("protocol.json"),
      mapping = await read("unblinded/mapping.json");
    const ledger = await read("ledger.json");
    expect(ledger.calls).toBe(0);
    await save(
      "live-started.json",
      { startedAt: new Date().toISOString(), maxCalls: 4 },
      true,
    );
    expect(await applicationSnapshot()).toEqual(frozen);
    for (const cell of mapping) {
      const model = models.find((m) => m.id === cell.model)!;
      const shared = await read(`${cell.site}-shared-request.json`);
      expect(sha(JSON.stringify(shared))).toBe(
        protocol.packets.find((p: { slug: string }) => p.slug === cell.site)
          .sharedSha256,
      );
      const request: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
        ...shared,
        model: model.id,
        max_output_tokens: model.maxOutput,
        store: false,
        service_tier: "default",
        ...(model.id === "gpt-6.1-sol"
          ? { reasoning: { effort: "medium" as const } }
          : {}),
      };
      const reservedInput =
        Buffer.byteLength(JSON.stringify(request), "utf8") + 2048;
      const reserve =
        (reservedInput * Math.max(model.input, model.write) +
          model.maxOutput * model.output) /
        1e6;
      if (ledger.spentUsd + ledger.uncertainReservedUsd + reserve >= 0.75) {
        await save("stopped.json", {
          reason: "Next request could exceed financial ceiling",
          label: cell.label,
        });
        break;
      }
      expect(ledger.calls).toBeLessThan(4);
      await save(
        `unblinded/${cell.label}-attempt.json`,
        {
          site: cell.site,
          request,
          reserve,
          startedAt: new Date().toISOString(),
        },
        true,
      );
      ledger.calls++;
      ledger.uncertainReservedUsd += reserve;
      await save("ledger.json", ledger);
      const started = Date.now();
      let response: OpenAI.Responses.Response | undefined;
      try {
        response = await api.responses.create(request);
        const apiLatencyMs = Date.now() - started;
        await save(`unblinded/${cell.label}-response.json`, response, true);
        const usage = response.usage;
        if (!usage)
          throw new Error("Missing API usage; full reservation retained");
        const cached = usage.input_tokens_details.cached_tokens ?? 0;
        const writes =
          (usage.input_tokens_details as { cache_write_tokens?: number })
            .cache_write_tokens ?? 0;
        const cost =
          ((usage.input_tokens - cached - writes) * model.input +
            cached * model.cached +
            writes * model.write +
            usage.output_tokens * model.output) /
          1e6;
        ledger.uncertainReservedUsd = Math.max(
          0,
          ledger.uncertainReservedUsd - reserve,
        );
        ledger.spentUsd += cost;
        await save("ledger.json", ledger);
        let parsed: unknown;
        let jsonValid = false,
          schemaValid = false,
          assembled = false;
        let diagnostics: unknown = null;
        const profile = await read(`${cell.site}-profile.json`);
        try {
          parsed = JSON.parse(response.output_text);
          jsonValid = true;
          const ids = profile.statements
            .filter(
              (s: { subject: string; kind: string }) =>
                s.subject === "Owner product" &&
                ["Website observation", "Owner product claim"].includes(s.kind),
            )
            .map((s: { id: string }) => s.id);
          const contract = acquisitionSchema(ids).parse(parsed);
          schemaValid = true;
          const report = validateEvidence(
            assembleAcquisition(contract, profile),
            (await read(`${cell.site}-sources.json`)).map(
              (s: { url: string }) => s.url,
            ),
          );
          assembled = true;
          await save(`unblinded/${cell.label}-assembled.json`, report, true);
          diagnostics = {
            deterministicFindings: deterministicQuality(report),
            publication: "Not attempted; diagnostic assembly only",
          };
        } catch (e) {
          const error = e as {
            name: string;
            issues?: { path: unknown[]; code: string }[];
            message?: string;
          };
          diagnostics = {
            error: error.name,
            issues: error.issues?.map((i) => ({
              path: i.path.join("."),
              code: i.code,
            })),
            message: error.issues ? undefined : error.message,
          };
        }
        await writeFile(
          resolve(root, `blind/${cell.label}.md`),
          `# ${cell.site} — ${cell.label}\n\nModel label hidden. Original first-attempt content; no repair.\n\n${parsed ? readable(parsed) : response.output_text || "No visible strategy was returned."}`,
          { flag: "wx" },
        );
        await save(
          `blind/${cell.label}.json`,
          parsed ?? {
            failure: "No valid JSON",
            outputText: response.output_text,
          },
          true,
        );
        await save(
          `unblinded/${cell.label}-result.json`,
          {
            ...cell,
            requestedModel: model.id,
            resolvedModel: response.model,
            status: response.status,
            incompleteDetails: response.incomplete_details,
            latencyMs: apiLatencyMs,
            actualInput: usage.input_tokens,
            actualOutput: usage.output_tokens,
            reasoningTokens: usage.output_tokens_details.reasoning_tokens,
            cachedInput: cached,
            cacheWrites: writes,
            estimatedCostUsd: cost,
            serviceTier: response.service_tier,
            jsonValid,
            schemaValid,
            assembled,
            completeStrategy: response.status === "completed" && schemaValid,
            diagnostics,
          },
          true,
        );
      } catch (e) {
        const error = e as {
          name: string;
          status?: number;
          code?: string;
          param?: string;
          message?: string;
        };
        await save(
          `unblinded/${cell.label}-result.json`,
          {
            ...cell,
            requestedModel: model.id,
            resolvedModel: response?.model ?? null,
            latencyMs: Date.now() - started,
            completeStrategy: false,
            failure: {
              name: error.name,
              status: error.status,
              code: error.code,
              param: error.param,
              message: error.message
                ?.replaceAll(process.env.OPENAI_API_KEY!, "[REDACTED]")
                .replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]"),
            },
            usageKnown: Boolean(response?.usage),
            reserveRetained: !response?.usage,
          },
          true,
        );
        await writeFile(
          resolve(root, `blind/${cell.label}.md`),
          `# ${cell.site} — ${cell.label}\n\nNo complete strategy was returned. Failure preserved; no retry.`,
          { flag: "wx" },
        );
      }
      // Deliberately do not print model, cost, latency or usage alongside labels
      // before the separate model-label-hidden content assessment is locked.
      console.info("Recorded a first-attempt benchmark response; no retry.");
    }
    const codeUnchanged =
      JSON.stringify(await applicationSnapshot()) === JSON.stringify(frozen);
    const envUnchanged =
      JSON.stringify(await envSnapshot()) === JSON.stringify(env);
    await save("integrity.json", {
      codeUnchanged,
      envUnchanged,
      paidCalls: ledger.calls,
      spentUsd: ledger.spentUsd,
      uncertainReservedUsd: ledger.uncertainReservedUsd,
      productionWrites: 0,
    });
    expect(codeUnchanged && envUnchanged).toBe(true);
    expect(ledger.spentUsd + ledger.uncertainReservedUsd).toBeLessThan(0.75);
  },
  1000000,
);
