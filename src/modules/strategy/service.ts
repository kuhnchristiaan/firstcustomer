import { verifyClaims } from "./claims";
import { profileEvidence } from "@/modules/intelligence/attribution";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { config } from "@/modules/config/env";
import { reportSchema } from "@/modules/intelligence/schema";
import { lockAdmission, increment } from "@/modules/guest/service";
import { tokenHash } from "@/modules/guest/security";
import { guestConfig } from "@/modules/guest/config";
import { enforceLimits } from "@/modules/usage/limits";
import { ProviderOutputError } from "@/modules/analysis/provider";
import type { Prisma } from "@/generated/prisma/client";
import { founderSchema, validateStrategy } from "./schema";
import { refineStrategy } from "./provider";
export type Access =
  | { tenant: { organizationId: string; userId: string }; analysisId: string }
  | { token: string | undefined; ipHash?: string };
import { strategyEnabled } from "./feature";
function enabled() {
  if (!strategyEnabled())
    throw new AppError(
      "Strategy refinement is not enabled yet. Your initial report remains available.",
      503,
    );
}
async function authorized(
  tx: Prisma.TransactionClient,
  a: Access,
  lock = false,
) {
  if ("tenant" in a) {
    if (lock)
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${a.tenant.organizationId} FOR UPDATE`;
    const member = await tx.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: a.tenant.organizationId,
          userId: a.tenant.userId,
        },
      },
    });
    if (
      !member ||
      member.status !== "ACTIVE" ||
      !["OWNER", "ADMIN", "MEMBER"].includes(member.role)
    )
      throw new AppError("Workspace access unavailable", 403);
    const run = await tx.analysisRun.findFirst({
      where: {
        id: a.analysisId,
        product: { organizationId: a.tenant.organizationId },
        status: "SUCCEEDED",
      },
      include: { sources: true },
    });
    if (!run) throw new AppError("Report unavailable", 404);
    return run;
  }
  const hash = tokenHash(a.token);
  if (lock)
    await tx.$queryRaw`SELECT id FROM "GuestAnalysisSession" WHERE "tokenHash"=${hash} FOR UPDATE`;
  const session = await tx.guestAnalysisSession.findUnique({
    where: { tokenHash: hash },
  });
  if (!session || session.claimedAt || session.expiresAt <= new Date())
    throw new AppError("Guest report unavailable", 404);
  if (lock && session.expiresAt.getTime() - Date.now() < 160000)
    throw new AppError(
      "Guest session is about to expire. Save your report first.",
      409,
    );
  const run = await tx.analysisRun.findFirst({
    where: { guestSessionId: session.id, productId: null, status: "SUCCEEDED" },
    orderBy: { startedAt: "desc" },
    include: { sources: true },
  });
  if (!run) throw new AppError("Report unavailable", 404);
  return run;
}
export async function readRevisions(a: Access) {
  enabled();
  return db().$transaction(async (tx) => {
    const base = await authorized(tx, a);
    const revisions = await tx.strategyRevision.findMany({
      where: { analysisId: base.id },
      orderBy: { version: "desc" },
    });
    const approved = base.productId
      ? await tx.strategyApproval.findFirst({
          where: { productId: base.productId },
          orderBy: { createdAt: "desc" },
        })
      : null;
    const latestContext = base.productId
      ? await tx.strategyRevision.findFirst({
          where: { analysis: { productId: base.productId } },
          orderBy: { createdAt: "desc" },
          select: { founderContext: true },
        })
      : revisions[0];
    return {
      defaultContext: latestContext?.founderContext ?? {},
      revisions: revisions.map((r) => ({
        id: r.id,
        version: r.version,
        status:
          r.status === "RUNNING" && r.leaseExpiresAt <= new Date()
            ? "FAILED"
            : r.status,
        context: r.founderContext,
        output: r.output,
        createdAt: r.createdAt,
        mock: r.provider === "mock",
        error: r.error,
        approved: r.id === approved?.revisionId,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        estimatedCost: r.estimatedCost?.toString() ?? null,
      })),
    };
  });
}
export async function generateRevision(a: Access, input: unknown) {
  enabled();
  const context = founderSchema.parse(input),
    e = config();
  if (Object.keys(context).length === 0)
    throw new AppError(
      "Add at least one answer or keep your initial strategy.",
      400,
    );
  const hash = createHash("sha256")
    .update(JSON.stringify(Object.fromEntries(Object.entries(context).sort())))
    .digest("hex");
  const guest = !("tenant" in a),
    g = guest ? guestConfig() : null;
  const inputRateConfigured =
    g?.GUEST_INPUT_USD_PER_MILLION ??
    e.OPENAI_INPUT_USD_PER_MILLION ??
    (process.env.GUEST_PRICED_MODEL === e.OPENAI_MODEL
      ? Number(process.env.GUEST_INPUT_USD_PER_MILLION)
      : NaN);
  const outputRateConfigured =
    g?.GUEST_OUTPUT_USD_PER_MILLION ??
    e.OPENAI_OUTPUT_USD_PER_MILLION ??
    (process.env.GUEST_PRICED_MODEL === e.OPENAI_MODEL
      ? Number(process.env.GUEST_OUTPUT_USD_PER_MILLION)
      : NaN);
  const maximumCost =
    (e.REFINEMENT_MAX_INPUT_TOKENS * inputRateConfigured +
      e.REFINEMENT_MAX_OUTPUT_TOKENS * outputRateConfigured) /
    1e6;
  if (
    e.MOCK_ANALYSIS !== "true" &&
    (!Number.isFinite(maximumCost) ||
      inputRateConfigured <= 0 ||
      outputRateConfigured <= 0 ||
      maximumCost >
        Math.min(g?.GUEST_MAX_COST_USD ?? Infinity, e.REFINEMENT_MAX_COST_USD))
  )
    throw new AppError(
      "Refinement cost limits need operator configuration.",
      503,
    );
  const reserved = await db().$transaction(
    async (tx) => {
      if (guest) await lockAdmission(tx);
      const base = await authorized(tx, a, true),
        now = new Date();
      await tx.strategyRevision.updateMany({
        where: {
          analysisId: base.id,
          status: "RUNNING",
          leaseExpiresAt: { lte: now },
        },
        data: { status: "FAILED", error: "Processing deadline exceeded" },
      });
      const history = await tx.strategyRevision.findMany({
        where: { analysisId: base.id },
        orderBy: { version: "desc" },
      });
      const duplicate = history.find(
        (r) => r.status === "SUCCEEDED" && r.contextHash === hash,
      );
      if (duplicate)
        return { base, revision: duplicate, previous: null, duplicate: true };
      if (history.some((r) => r.status === "RUNNING"))
        throw new AppError("Refinement is already processing", 409);
      if (
        guest &&
        (history.some((r) => r.status === "SUCCEEDED") || history.length >= 2)
      )
        throw new AppError(
          "Your guest refinement limit is reached. Your reports remain readable; save them to continue later.",
          429,
        );
      if (guest && g && "token" in a) {
        if (!a.ipHash) throw new AppError("Guest protection unavailable", 503);
        const concurrent =
          (await tx.analysisRun.count({
            where: {
              productId: null,
              guestSessionId: { not: null },
              status: "RUNNING",
              leaseExpiresAt: { gt: now },
            },
          })) +
          (await tx.strategyRevision.count({
            where: {
              analysis: { productId: null, guestSessionId: { not: null } },
              status: "RUNNING",
              leaseExpiresAt: { gt: now },
            },
          }));
        if (concurrent >= g.GUEST_MAX_CONCURRENT)
          throw new AppError("Free reports are busy. Try again shortly.", 429);
        const expiry = new Date(now.getTime() + 48 * 3600000),
          day = now.toISOString().slice(0, 10),
          hour = now.toISOString().slice(0, 13);
        for (const [key, limit] of [
          [`guest:daily:${day}`, g.GUEST_DAILY_CAP],
          [`guest:ip:day:${day}:${a.ipHash}`, g.GUEST_IP_DAILY_ATTEMPTS],
          [`guest:ip:hour:${hour}:${a.ipHash}`, g.GUEST_IP_HOURLY_ATTEMPTS],
        ] as const)
          await increment(
            tx,
            key,
            limit,
            expiry,
            "Your free generation limit has been reached. Please try again later.",
          );
      } else if ("tenant" in a) {
        const scope = {
            analysis: { product: { organizationId: a.tenant.organizationId } },
          },
          original = { product: { organizationId: a.tenant.organizationId } },
          month = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
          ),
          recent = new Date(now.getTime() - 60000);
        const monthly =
          (await tx.strategyRevision.count({
            where: { ...scope, createdAt: { gte: month } },
          })) +
          (await tx.analysisRun.count({
            where: { ...original, startedAt: { gte: month } },
          }));
        const running =
          (await tx.strategyRevision.count({
            where: { ...scope, status: "RUNNING", leaseExpiresAt: { gt: now } },
          })) +
          (await tx.analysisRun.count({
            where: {
              ...original,
              status: "RUNNING",
              leaseExpiresAt: { gt: now },
            },
          }));
        const count =
          (await tx.strategyRevision.count({
            where: { ...scope, createdAt: { gte: recent } },
          })) +
          (await tx.analysisRun.count({
            where: { ...original, startedAt: { gte: recent } },
          }));
        enforceLimits(
          { monthly, running, recent: count },
          {
            monthly: e.MONTHLY_ANALYSIS_QUOTA,
            concurrent: e.MAX_CONCURRENT_ANALYSES,
          },
        );
      }
      const revision = await tx.strategyRevision.create({
        data: {
          analysisId: base.id,
          version: (history[0]?.version ?? 0) + 1,
          founderContext: context,
          contextHash: hash,
          leaseExpiresAt: new Date(now.getTime() + 140000),
          provider: e.MOCK_ANALYSIS === "true" ? "mock" : "openai",
          model: e.MOCK_ANALYSIS === "true" ? "fixture-v3" : e.OPENAI_MODEL,
        },
      });
      return {
        base,
        revision,
        previous: history.find((r) => r.status === "SUCCEEDED")?.output ?? null,
        duplicate: false,
      };
    },
    { timeout: 15000, maxWait: 10000 },
  );
  if (reserved.duplicate) return reserved.revision.id;
  let inputTokens = 0,
    outputTokens = 0;
  const inputRate = Number.isFinite(inputRateConfigured)
      ? inputRateConfigured
      : undefined,
    outputRate = Number.isFinite(outputRateConfigured)
      ? outputRateConfigured
      : undefined;
  const cost = () =>
    inputRate !== undefined && outputRate !== undefined
      ? (inputTokens * inputRate + outputTokens * outputRate) / 1e6
      : null;
  try {
    const initialReport = reportSchema.parse(reserved.base.output);
    const result = await refineStrategy(
      initialReport,
      context,
      initialReport.schemaVersion === "1.1"
        ? profileEvidence(initialReport.productIntelligence)
        : reserved.base.sources.map((s) => ({
            url: s.url,
            content: s.content.slice(0, 600),
          })),
      reserved.previous,
      {
        input: e.REFINEMENT_MAX_INPUT_TOKENS,
        output: e.REFINEMENT_MAX_OUTPUT_TOKENS,
      },
    );
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    const validatedOutput = validateStrategy(result.strategy, context);
    if (validatedOutput.schemaVersion !== "3.0")
      throw new ProviderOutputError(
        inputTokens,
        outputTokens,
        "critique_failed",
      );
    const written = await db().strategyRevision.updateMany({
      where: {
        id: reserved.revision.id,
        status: "RUNNING",
        leaseExpiresAt: { gt: new Date() },
      },
      data: {
        status: "SUCCEEDED",
        output: validatedOutput,
        inputTokens,
        outputTokens,
        estimatedCost: cost(),
      },
    });
    if (!written.count) throw new Error("Refinement lease expired");
    return reserved.revision.id;
  } catch (error) {
    let message =
      "Refinement failed. Your original report is unchanged. Please try again later.";
    if (error instanceof ProviderOutputError) {
      inputTokens = error.inputTokens;
      outputTokens = error.outputTokens;
      const reasons: Record<string, string> = {
        "Strategy exceeds weekly time allowance":
          "The generated plan exceeded your available weekly time.",
        "Channel effort exceeds weekly allowance":
          "The generated channels exceeded your available weekly time.",
        "Strategy exceeds budget or uses wrong currency":
          "The generated channels did not fit your budget or currency.",
        "Invalid acquisition stages":
          "The generated acquisition stages were invalid.",
        "Invalid priorities or weeks":
          "The generated priorities or weekly schedule were invalid.",
        incomplete_output: "The AI stopped before completing the strategy.",
        critique_failed:
          "The independent strategy review did not pass validation.",
        critique_input_budget:
          "The stored evidence exceeds the bounded strategy review budget.",
        invalid_schema: "The AI returned an invalid strategy structure.",
      };
      message = `${reasons[error.reason] ?? "The AI returned an invalid strategy."} Your original report is unchanged. Please try again later.`;
      console.error(
        JSON.stringify({
          event: "refinement_rejected",
          code: Object.hasOwn(reasons, error.reason)
            ? error.reason
            : "invalid_output",
          inputTokens,
          outputTokens,
        }),
      );
    } else {
      const inputBudget =
        error instanceof Error &&
        error.message === "Refinement input exceeds budget";
      const status =
        typeof error === "object" &&
        error &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : null;
      const code = inputBudget
        ? "input_budget"
        : status === 429
          ? "provider_rate_limit"
          : status === 401
            ? "provider_auth"
            : status === 400
              ? "provider_request"
              : "generation_error";
      if (inputBudget)
        message =
          "This stored report exceeds the refinement input budget. Your original report is unchanged.";
      else if (status === 429)
        message =
          "The AI provider is temporarily rate limited. Your original report is unchanged. Please try again later.";
      console.error(
        JSON.stringify({ event: "refinement_failed", code, status }),
      );
    }
    await db().strategyRevision.updateMany({
      where: { id: reserved.revision.id, status: "RUNNING" },
      data: {
        status: "FAILED",
        error: message,
        inputTokens,
        outputTokens,
        estimatedCost: cost(),
      },
    });
    throw new AppError(message, 502);
  }
}
export async function approveRevision(
  a: Access,
  revisionId: string,
  edited?: unknown,
) {
  enabled();
  if (!("tenant" in a))
    throw new AppError("Sign in to approve a strategy", 401);
  return db().$transaction(async (tx) => {
    const base = await authorized(tx, a, true);
    const revision = await tx.strategyRevision.findFirst({
      where: { id: revisionId, analysisId: base.id, status: "SUCCEEDED" },
    });
    if (!revision?.output || !base.productId)
      throw new AppError("Strategy unavailable", 404);
    if (edited !== undefined) {
      let output;
      try {
        output = validateStrategy(
          edited,
          founderSchema.parse(revision.founderContext),
        );
      } catch {
        throw new AppError(
          "Check edited sections: preserve the schema, priorities, time and budget limits.",
          400,
        );
      }
      const { schemaVersion, ...fields } = output;
      const reviews =
        output.schemaVersion === "3.0" ? output.intelligence.claims : [];
      const payload =
        output.schemaVersion === "3.0"
          ? Object.fromEntries(
              Object.entries(fields).filter(([k]) => k !== "intelligence"),
            )
          : fields;
      const checked = verifyClaims(
        payload,
        reviews,
        base.sources,
        founderSchema.parse(revision.founderContext),
      );
      // An edited rationale is publication content too; raw review metadata stays separate.
      const safeIntelligence =
        output.schemaVersion === "3.0"
          ? (() => {
              const { claims, claimActions, generation, ...assessment } =
                output.intelligence;
              return {
                ...verifyClaims(
                  assessment,
                  [],
                  base.sources,
                  founderSchema.parse(revision.founderContext),
                ).value,
                claims,
                claimActions: [...claimActions, ...checked.actions],
                generation,
              };
            })()
          : null;
      output = validateStrategy(
        {
          ...checked.value,
          schemaVersion,
          ...(output.schemaVersion === "3.0"
            ? {
                intelligence: {
                  ...safeIntelligence!,
                },
              }
            : {}),
        },
        founderSchema.parse(revision.founderContext),
      );
      const latest = await tx.strategyRevision.findFirst({
        where: { analysisId: base.id },
        orderBy: { version: "desc" },
      });
      if (latest?.id !== revisionId)
        throw new AppError(
          "A newer revision exists. Open it before editing.",
          409,
        );
      const next = await tx.strategyRevision.create({
        data: {
          analysisId: base.id,
          version: revision.version + 1,
          founderContext: founderSchema.parse(revision.founderContext),
          contextHash: `edited:${revision.id}`,
          output,
          status: "SUCCEEDED",
          provider: "founder-edit",
          model: "manual-v2",
          leaseExpiresAt: new Date(),
          estimatedCost: 0,
        },
      });
      revisionId = next.id;
    }
    await tx.strategyApproval.create({
      data: { revisionId, productId: base.productId, actorId: a.tenant.userId },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: a.tenant.organizationId,
        actorId: a.tenant.userId,
        action: "STRATEGY_REVISION_APPROVED",
        resourceId: revisionId,
      },
    });
    return revisionId;
  });
}
