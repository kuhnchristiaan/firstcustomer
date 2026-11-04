import { it, expect } from "vitest";
import { config as loadEnv } from "dotenv";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { crawl } from "@/modules/website/extract";
import { provider } from "@/modules/analysis/provider";
import {
  validateProductProfile,
  validateBasis,
} from "@/modules/intelligence/product-profile";
import { strategyProductInput } from "@/modules/intelligence/attribution";
it.skipIf(process.env.LIVE_ATTRIBUTION_TEST !== "true")(
  "attributes the actual FirstCustomers website through the real bounded AI pipeline",
  async () => {
    loadEnv({ path: ".env.local", quiet: true });
    const sources = await crawl(
      "https://www.firstcustomers.app/",
      1,
      5000,
      AbortSignal.timeout(30000),
    );
    const result = await provider().analyze(
      sources,
      AbortSignal.timeout(110000),
      { inputTokens: 30000, outputTokens: 6000 },
    );
    expect(result.report.schemaVersion).toBe("1.1");
    if (result.report.schemaVersion !== "1.1")
      throw Error("Missing attribution");
    const profile = validateProductProfile(
      result.report.productIntelligence,
      sources,
    );
    expect(profile.identity.category).toBe("Customer acquisition");
    expect(profile.identity.name.toLowerCase()).toBe("firstcustomers");
    validateBasis(result.report.recommendationBasis, profile);
    expect(strategyProductInput(result.report)).toMatchObject({
      profile: {
        identity: {
          name: profile.identity.name,
          primaryJob: profile.identity.primaryJob,
        },
      },
    });
    await mkdir(".local-live-test", { recursive: true });
    await writeFile(
      ".local-live-test/milestone5-own-site.json",
      JSON.stringify({ sources, ...result }, null, 2),
    );
    console.log(
      JSON.stringify({
        product: profile.identity.name,
        category: profile.identity.category,
        stages: 2,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      }),
    );
  },
  125000,
);

it.skipIf(process.env.LIVE_ATTRIBUTION_REFINEMENT !== "true")(
  "refines the attributed FirstCustomers report with the same immutable product profile",
  async () => {
    loadEnv({ path: ".env.local", quiet: true });
    const { refineStrategy } = await import("@/modules/strategy/provider");
    const { reportSchema } = await import("@/modules/intelligence/schema");
    const { profileEvidence } =
      await import("@/modules/intelligence/attribution");
    const saved = JSON.parse(
      await readFile(".local-live-test/milestone5-own-site.json", "utf8"),
    );
    const report = reportSchema.parse(saved.report);
    if (report.schemaVersion !== "1.1")
      throw Error("Attributed report required");
    const before = JSON.stringify(report.productIntelligence);
    const context = {
      payingCustomers: "0" as const,
      weeklyTime: "1–2 hours" as const,
      weeklyMinutes: 90,
      monthlyBudget: 0,
      currency: "USD" as const,
    };
    const result = await refineStrategy(
      report,
      context,
      profileEvidence(report.productIntelligence),
      null,
      { input: 38000, output: 9000 },
    );
    expect(result.strategy.schemaVersion).toBe("3.0");
    expect(JSON.stringify(report.productIntelligence)).toBe(before);
    await writeFile(
      ".local-live-test/milestone5-refined.json",
      JSON.stringify(result, null, 2),
    );
    console.log({
      refinementSchema: result.strategy.schemaVersion,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
  },
  125000,
);

it.skipIf(process.env.LIVE_SIGNED_ANALYSIS_TEST !== "true")(
  "analyzes Plausible with the signed-in default 20k/4500 limits",
  async () => {
    loadEnv({ path: ".env.local", quiet: true });
    const signal = AbortSignal.timeout(125000);
    const sources = await crawl(
      "https://plausible.io/",
      3,
      Math.floor((20000 - 3500) / 4),
      signal,
    );
    const result = await provider().analyze(sources, signal, {
      inputTokens: 20000,
      outputTokens: 4500,
    });
    expect(result.report.schemaVersion).toBe("1.1");
    if (result.report.schemaVersion !== "1.1")
      throw Error("Missing attribution");
    const profile = validateProductProfile(
      result.report.productIntelligence,
      sources,
    );
    expect(profile.identity.certainty).toBe("Website-supported");
    expect(profile.identity.name.toLowerCase()).toContain("plausible");
    expect(profile.identity.category).toBe("Product analytics");
    validateBasis(result.report.recommendationBasis, profile);
    await mkdir(".local-live-test", { recursive: true });
    await writeFile(
      ".local-live-test/plausible-signed-analysis.json",
      JSON.stringify({ sources, ...result }, null, 2),
    );
    console.log({
      product: profile.identity.name,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
  },
  135000,
);
