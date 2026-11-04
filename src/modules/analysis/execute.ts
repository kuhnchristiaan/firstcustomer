import { db } from "@/lib/db";
import { config } from "@/modules/config/env";
import { crawl } from "@/modules/website/extract";
import { provider, ProviderOutputError } from "./provider";
import { AppError } from "@/lib/errors";
import { metric } from "@/modules/analytics/service";
export type AnalysisLimits = {
  pages: number;
  chars: number;
  inputTokens: number;
  outputTokens: number;
  inputRate: number;
  outputRate: number;
};
export async function executeAnalysis(
  runId: string,
  productId: string | null,
  websiteUrl: string,
  limits?: AnalysisLimits,
  tenant?: { organizationId: string; userId: string },
) {
  const e = config();
  let knownUsage:
    | {
        inputTokens: number;
        outputTokens: number;
        estimatedCost: number | null;
      }
    | undefined;
  const cost = (input: number, output: number) => {
    const i = limits?.inputRate ?? e.OPENAI_INPUT_USD_PER_MILLION;
    const o = limits?.outputRate ?? e.OPENAI_OUTPUT_USD_PER_MILLION;
    return e.MOCK_ANALYSIS === "true"
      ? 0
      : i !== undefined && o !== undefined
        ? (input * i + output * o) / 1000000
        : null;
  };
  try {
    const signal = AbortSignal.timeout(125000);
    const sources =
      e.MOCK_ANALYSIS === "true"
        ? []
        : await crawl(
            websiteUrl,
            limits?.pages ?? e.MAX_PAGES,
            limits?.chars ??
              Math.min(
                e.MAX_CONTENT_CHARS,
                Math.floor((e.MAX_INPUT_TOKENS - 3500) / 4),
              ),
            signal,
          );
    const result = await provider().analyze(
      sources,
      signal,
      limits
        ? { inputTokens: limits.inputTokens, outputTokens: limits.outputTokens }
        : undefined,
    );
    knownUsage = {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: cost(result.inputTokens, result.outputTokens),
    };
    await db().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "AnalysisRun" WHERE id=${runId} FOR UPDATE`;
        const active = await tx.analysisRun.findFirst({
          where: {
            id: runId,
            status: "RUNNING",
            leaseExpiresAt: { gt: new Date() },
          },
        });
        if (!active)
          throw new AppError(
            "The report processing deadline expired. Please try again.",
            409,
          );
        await tx.websiteSource.createMany({
          data: sources.map((s) => ({
            url: s.url,
            title: s.title,
            content: s.content,
            contentHash: s.contentHash,
            status: s.status,
            productId,
            analysisId: runId,
          })),
        });
        await tx.analysisRun.update({
          where: { id: runId },
          data: {
            status: "SUCCEEDED",
            completedAt: new Date(),
            ...knownUsage,
            output: result.report,
          },
        });
        if (productId)
          await tx.product.update({
            where: { id: productId },
            data: { name: result.report.businessName },
          });
        if (tenant)
          await tx.auditEvent.create({
            data: {
              organizationId: tenant.organizationId,
              actorId: tenant.userId,
              action: "REPORT_GENERATED",
              resourceId: runId,
            },
          });
        else await metric("report_generated", tx);
      },
      { maxWait: 10000, timeout: 15000 },
    );
    return result;
  } catch (error) {
    if (error instanceof ProviderOutputError) {
      knownUsage = {
        inputTokens: error.inputTokens,
        outputTokens: error.outputTokens,
        estimatedCost: cost(error.inputTokens, error.outputTokens),
      };
      console.error(
        JSON.stringify({
          event: "analysis_output_rejected",
          runId,
          reason: error.reason.slice(0, 2000),
        }),
      );
    }
    await db().analysisRun.updateMany({
      where: { id: runId, status: "RUNNING" },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        ...knownUsage,
        error:
          error instanceof AppError
            ? error.message
            : "Analysis failed or timed out. No results were invented.",
      },
    });
    if (!tenant) await metric("analysis_failed");
    throw error instanceof AppError
      ? error
      : new AppError(
          "The report could not be generated. Please try again.",
          502,
        );
  }
}
