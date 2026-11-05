import { it, expect } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { groundReport } from "@/modules/intelligence/attribution";
import {
  basisSchema,
  validateBasis,
} from "@/modules/intelligence/product-profile";
import { reportV1Schema, reportV11Schema } from "@/modules/intelligence/schema";
import { firstExperimentSchema } from "@/modules/intelligence/experiment";
import { deterministicQuality } from "@/modules/intelligence/quality";
import { safeInitialReport } from "@/modules/strategy/claims";
import { productEvidence } from "@/modules/website/document";

// Offline artifact preparation only: no provider, credentials or model call.
const root = "docs/milestone-6-2-live-2026-11-05";
const load = async (p: string) =>
  JSON.parse(await readFile(`${root}/${p}`, "utf8"));
it
  .skipIf(process.env.M62_OFFLINE_ARTIFACTS !== "true")
  .each(["senja", "greensighter", "firstcustomers", "tally"])(
  "renders the genuine recorded %s report and diagnoses it offline",
  async (slug) => {
    const stages = await load(`${slug}/stages.json`),
      result = await load(`${slug}/result.json`);
    const raw = stages.find(
      (s: { stage: string }) => s.stage === "business_intelligence",
    ).output;
    const profile = await load(`${slug}/product-profile.json`),
      sources = await load(`${slug}/sources.json`);
    let attributionError: string | null = null;
    try {
      validateBasis(basisSchema.parse(raw.recommendationBasis), profile);
    } catch (e) {
      attributionError = e instanceof Error ? e.message : "Invalid attribution";
    }
    const parsed = reportV1Schema.parse(raw);
    firstExperimentSchema.parse(raw.firstExperiment);
    // For Greensighter this binding is for diagnostic inspection ONLY: the live
    // pipeline rejected its basis first. Its original report is never corrected.
    const diagnosticCopy = reportV11Schema.parse({
      ...groundReport(parsed, profile, true),
      schemaVersion: "1.1",
      productIntelligence: profile,
      recommendationBasis: raw.recommendationBasis,
      firstExperiment: raw.firstExperiment,
    });
    const clean = safeInitialReport(diagnosticCopy, productEvidence(sources));
    const differences: {
      path: string;
      original: unknown;
      sanitised: unknown;
    }[] = [];
    const compare = (a: unknown, b: unknown, path: string) => {
      if (JSON.stringify(a) === JSON.stringify(b)) return;
      if (a && b && typeof a === "object" && typeof b === "object")
        for (const k of Object.keys(a))
          compare(
            (a as Record<string, unknown>)[k],
            (b as Record<string, unknown>)[k],
            path ? `${path}.${k}` : k,
          );
      else differences.push({ path, original: a, sanitised: b });
    };
    compare(diagnosticCopy, clean, "");
    await writeFile(
      `${root}/${slug}/offline-validation.json`,
      JSON.stringify(
        {
          mode: "Read-only diagnosis of genuine model output; no new calls or modifications to original evidence",
          attributionError,
          distinctBasisSections: [
            ...new Set(
              raw.recommendationBasis.map(
                (b: { section: string }) => b.section,
              ),
            ),
          ],
          deterministicQualityExecutedLive: result.firstCandidateAvailable,
          diagnosticChecks: deterministicQuality(diagnosticCopy),
          sanitiserDifferences: differences,
          oldFallbackSentenceOccurrences:
            JSON.stringify(raw).split(
              "Ask the buyer about their current workflow and validate the relevant product capabilities before making a claim.",
            ).length - 1,
        },
        null,
        2,
      ),
    );
    const display = async (
      name: string,
      report: Record<string, unknown>,
      warning: string,
    ) => {
      const body = Object.entries(report)
        .map(
          ([k, v]) =>
            `## ${k}\n\n${typeof v === "string" ? v : "```json\n" + JSON.stringify(v, null, 2) + "\n```"}\n`,
        )
        .join("\n");
      await writeFile(
        `${root}/${slug}/${name}`,
        `# ${raw.businessName} — actual generated report\n\n**Rejected; never published.** ${warning}\n\n${body}`,
      );
    };
    await display(
      "generated-report.md",
      raw,
      "This is the complete original model JSON rendered for inspection, including its original confidence labels and statement-ID references. Those labels are not accepted evidence or independent verification. Product quotations are in product-profile.json.",
    );
    if (result.firstCandidateAvailable)
      await display(
        "candidate-report.md",
        await load(`${slug}/first-candidate.json`),
        "This copy includes the application's normal immutable product binding. The attempted repair was incomplete and was not applied. Publisher claims are not independent proof.",
      );
    for (const [i, s] of stages.entries()) {
      const stage = s as { stage: string; status: string; outputText?: string };
      if (stage.stage === "quality_repair")
        await writeFile(
          `${root}/${slug}/incomplete-repair.txt`,
          stage.outputText ?? "",
        );
      if (stage.stage === "quality_review")
        await writeFile(
          `${root}/${slug}/semantic-review-${i}.txt`,
          stage.outputText ?? "",
        );
    }
    expect(result.testedLimits.outputTokens).toBe(4500);
    expect(
      stages.filter(
        (s: { stage: string }) => s.stage === "business_intelligence",
      ),
    ).toHaveLength(1);
  },
);
