import { it, expect } from "vitest";
import { config as loadEnv } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "@/modules/config/env";
import { crawl } from "@/modules/website/extract";
import { provider } from "@/modules/analysis/provider";

it.skipIf(process.env.LIVE_REPORT_TEST !== "true")(
  "generates a schema-valid SaaS strategy through the real OpenAI API",
  async () => {
    loadEnv({ path: ".env.local", quiet: true });
    const settings = config();
    expect(settings.MOCK_ANALYSIS).toBe("false");
    const signal = AbortSignal.timeout(125000);
    const sources = await crawl(
      "https://plausible.io/",
      2,
      Math.min(
        settings.MAX_CONTENT_CHARS,
        Math.floor((settings.MAX_INPUT_TOKENS - 3500) / 4),
      ),
      signal,
    );
    const result = await provider().analyze(sources, signal);
    expect(result.report.segments).toHaveLength(3);
    expect(result.report.thirtyDayPlan).toHaveLength(4);
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
    await mkdir(".local-live-test", { recursive: true });
    await writeFile(
      ".local-live-test/saas-strategy.json",
      JSON.stringify(result, null, 2),
    );
    console.log(
      JSON.stringify({
        liveReport: "passed",
        website: "https://plausible.io/",
        businessName: result.report.businessName,
        pages: sources.length,
        model: settings.OPENAI_MODEL,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        segments: result.report.segments.length,
        weeks: result.report.thirtyDayPlan.length,
      }),
    );
  },
  140000,
);
