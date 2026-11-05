import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { AppError, ownedProduct } from "@/modules/auth/tenant";
import { normalizeUrl } from "@/modules/website/safe-fetch";
import { validateProductProfile } from "@/modules/intelligence/product-profile";
import { founderSchema } from "@/modules/strategy/schema";
import { config } from "@/modules/config/env";
import type { Prisma } from "@/generated/prisma/client";
import { advisorConfig } from "./config";
import {
  advisorSchema,
  contextSchema,
  emptyContext,
  type FounderContext,
} from "./schema";
import { generateAdvisor, explainAdvisor, type UsageEntry } from "./provider";

type Tenant = { organizationId: string; userId: string };
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function advisorWorkspace(t: Tenant, productId: string) {
  advisorConfig();
  await ownedProduct(t.organizationId, productId);
  const w = await db().advisorWorkspace.findUnique({
    where: { productId },
    include: {
      product: true,
      strategies: {
        orderBy: { version: "desc" },
        take: 1,
        include: { tasks: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!w) throw new AppError("Start your advisor from the workspace.", 404);
  return w;
}

function importedContext(value: unknown): FounderContext {
  const old = founderSchema.safeParse(value);
  if (!old.success) return structuredClone(emptyContext);
  const c = old.data;
  const mapping: Record<string, string> = {
    None: "None",
    "Cold email": "Direct outreach",
    "LinkedIn outreach": "Direct outreach",
    "SEO or content marketing": "Content/SEO",
    "Paid advertising": "Paid advertising",
    "Online communities": "Communities/partnerships",
    "Partnerships or referrals": "Communities/partnerships",
  };
  const candidate = {
    ...structuredClone(emptyContext),
    productStage:
      c.stage &&
      [
        "Pre-launch",
        "Launched, no paying customers",
        "Already have paying customers",
      ].includes(c.stage)
        ? c.stage
        : c.payingCustomers && c.payingCustomers !== "0"
          ? "Already have paying customers"
          : null,
    resources: {
      hoursPerWeek: c.weeklyMinutes !== undefined ? c.weeklyMinutes / 60 : null,
      monthlyBudget:
        c.monthlyBudget !== undefined && c.currency
          ? { amount: c.monthlyBudget, currency: c.currency }
          : null,
    },
    previousEfforts: {
      channels: c.channels?.length
        ? [...new Set(c.channels.map((x) => mapping[x]).filter(Boolean))]
        : null,
      other: null,
    },
  };
  const parsed = contextSchema.safeParse(candidate);
  return parsed.success ? parsed.data : structuredClone(emptyContext);
}

export async function startAdvisor(t: Tenant, url: string) {
  advisorConfig();
  const websiteUrl = normalizeUrl(url);
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${t.organizationId} FOR UPDATE`;
    const product = await tx.product.upsert({
      where: {
        organizationId_websiteUrl: {
          organizationId: t.organizationId,
          websiteUrl,
        },
      },
      create: {
        organizationId: t.organizationId,
        websiteUrl,
        name: new URL(websiteUrl).hostname,
      },
      update: {},
    });
    const existing = await tx.advisorWorkspace.findUnique({
      where: { productId: product.id },
    });
    if (existing) return product.id;
    const old = await tx.strategyRevision.findFirst({
      where: { analysis: { productId: product.id } },
      orderBy: { createdAt: "desc" },
      select: { founderContext: true },
    });
    const analysis = await tx.analysisRun.findFirst({
      where: { productId: product.id, status: "SUCCEEDED" },
      orderBy: { startedAt: "desc" },
      include: { sources: true },
    });
    let profile: unknown;
    if (
      analysis?.output &&
      typeof analysis.output === "object" &&
      !Array.isArray(analysis.output) &&
      "productIntelligence" in analysis.output
    ) {
      try {
        profile = validateProductProfile(
          analysis.output.productIntelligence,
          analysis.sources,
        );
      } catch {
        /* A fresh attributed analysis is required. */
      }
    }
    await tx.advisorWorkspace.create({
      data: {
        productId: product.id,
        founderContext: json(importedContext(old?.founderContext)),
        ...(profile
          ? { profile: json(profile), sources: json(analysis!.sources) }
          : {}),
      },
    });
    return product.id;
  });
}

export async function saveContext(
  t: Tenant,
  productId: string,
  input: unknown,
  expectedVersion: number,
) {
  const w = await advisorWorkspace(t, productId);
  if (w.strategies.length)
    throw new AppError(
      "Your saved plan is fixed. Context changes require a separate strategy decision.",
      409,
    );
  const context = contextSchema.parse(input);
  const updated = await db().advisorWorkspace.updateMany({
    where: { id: w.id, version: expectedVersion, strategies: { none: {} } },
    data: { founderContext: json(context), version: { increment: 1 } },
  });
  if (!updated.count)
    throw new AppError(
      "Your answers changed in another window. Reload before saving.",
      409,
    );
  return advisorWorkspace(t, productId);
}

async function reserve(
  t: Tenant,
  workspaceId: string,
  kind: string,
  requestKey: string,
) {
  const a = advisorConfig();
  const e = config();
  if (!a.fixture && a.ADVISOR_LIVE_ENABLED !== "true")
    throw new AppError(
      "Live advisor calls are disabled pending separate paid testing approval.",
      503,
    );
  return db().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${t.organizationId} FOR UPDATE`;
      const owned = await tx.advisorWorkspace.findFirst({
        where: {
          id: workspaceId,
          product: { organizationId: t.organizationId },
        },
      });
      if (!owned) throw new AppError("Advisor unavailable.", 404);
      const cached = await tx.advisorOperation.findUnique({
        where: {
          workspaceId_kind_requestKey: { workspaceId, kind, requestKey },
        },
      });
      if (cached) {
        if (cached.status === "SUCCEEDED")
          return { operation: cached, cached: true };
        throw new AppError(
          cached.status === "RUNNING" && cached.leaseExpiresAt > new Date()
            ? "The advisor is already working on this request."
            : "This attempt failed or expired. Save your answers again before a new attempt.",
          409,
        );
      }
      const now = new Date();
      await tx.advisorOperation.updateMany({
        where: {
          workspace: { product: { organizationId: t.organizationId } },
          status: "RUNNING",
          leaseExpiresAt: { lte: now },
        },
        data: { status: "FAILED", error: "Processing deadline exceeded." },
      });
      const scope = {
        workspace: { product: { organizationId: t.organizationId } },
      };
      const month = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const [
        monthly,
        recent,
        running,
        reports,
        revisions,
        reportRunning,
        revisionRunning,
      ] = await Promise.all([
        tx.advisorOperation.count({
          where: { ...scope, createdAt: { gte: month } },
        }),
        tx.advisorOperation.count({
          where: {
            ...scope,
            createdAt: { gte: new Date(now.getTime() - 60000) },
          },
        }),
        tx.advisorOperation.count({
          where: { ...scope, status: "RUNNING", leaseExpiresAt: { gt: now } },
        }),
        tx.analysisRun.count({
          where: {
            product: { organizationId: t.organizationId },
            startedAt: { gte: month },
          },
        }),
        tx.strategyRevision.count({
          where: {
            analysis: { product: { organizationId: t.organizationId } },
            createdAt: { gte: month },
          },
        }),
        tx.analysisRun.count({
          where: {
            product: { organizationId: t.organizationId },
            status: "RUNNING",
            leaseExpiresAt: { gt: now },
          },
        }),
        tx.strategyRevision.count({
          where: {
            analysis: { product: { organizationId: t.organizationId } },
            status: "RUNNING",
            leaseExpiresAt: { gt: now },
          },
        }),
      ]);
      if (
        monthly + reports + revisions >= e.MONTHLY_ANALYSIS_QUOTA ||
        recent >= 3 ||
        running + reportRunning + revisionRunning >= e.MAX_CONCURRENT_ANALYSES
      )
        throw new AppError(
          "Advisor request limit reached. Wait before requesting more help.",
          429,
        );
      const ceiling = kind === "strategy" ? a.strategyCeiling : a.assistCeiling;
      const key = `advisor:daily:${now.toISOString().slice(0, 10)}`;
      await tx.$executeRaw`INSERT INTO "UsageBucket" ("key","count","expiresAt") VALUES (${key},0,${new Date(now.getTime() + 172800000)}) ON CONFLICT ("key") DO NOTHING`;
      await tx.$queryRaw`SELECT key FROM "UsageBucket" WHERE key=${key} FOR UPDATE`;
      const bucket = await tx.usageBucket.findUniqueOrThrow({ where: { key } });
      const micros = Math.ceil(ceiling * 1e6);
      if (bucket.count + micros > a.ADVISOR_DAILY_USD * 1e6)
        throw new AppError(
          "The advisor's daily spending allowance has been reserved. Try tomorrow.",
          429,
        );
      await tx.usageBucket.update({
        where: { key },
        data: { count: { increment: micros } },
      });
      const operation = await tx.advisorOperation.create({
        data: {
          workspaceId,
          kind,
          requestKey,
          model:
            kind === "strategy"
              ? a.ADVISOR_STRATEGY_MODEL
              : a.ADVISOR_ASSIST_MODEL,
          reservedUsd: ceiling,
          leaseExpiresAt: new Date(now.getTime() + 170000),
        },
      });
      return { operation, cached: false };
    },
    { timeout: 15000 },
  );
}

async function failOperation(id: string, usage: UsageEntry[]) {
  await db().advisorOperation.updateMany({
    where: { id, status: "RUNNING" },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      usage: json({ calls: usage, reservationRetained: true }),
      error:
        "The advisor could not complete this request. No strategy was changed.",
    },
  });
}

export async function generateStrategy(
  t: Tenant,
  productId: string,
  expectedVersion: number,
) {
  const w = await advisorWorkspace(t, productId);
  if (w.strategies.length) return w;
  if (w.version !== expectedVersion)
    throw new AppError("Your answers changed. Reload before generating.", 409);
  const reserved = await reserve(t, w.id, "strategy", `context-${w.version}`);
  if (reserved.cached) return advisorWorkspace(t, productId);
  const usage: UsageEntry[] = [];
  try {
    const output = await generateAdvisor(
      {
        url: w.product.websiteUrl,
        context: contextSchema.parse(w.founderContext),
        profile: w.profile,
        sources: w.sources,
      },
      usage,
      async (profile, sources) => {
        await db().advisorWorkspace.updateMany({
          where: { id: w.id, version: w.version },
          data: { profile: json(profile), sources: json(sources) },
        });
      },
    );
    await db().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AdvisorWorkspace" WHERE id=${w.id} FOR UPDATE`;
      const current = await tx.advisorWorkspace.findUniqueOrThrow({
        where: { id: w.id },
      });
      const op = await tx.advisorOperation.findFirst({
        where: {
          id: reserved.operation.id,
          status: "RUNNING",
          leaseExpiresAt: { gt: new Date() },
        },
      });
      if (
        current.version !== w.version ||
        !op ||
        (await tx.advisorStrategy.count({ where: { workspaceId: w.id } }))
      )
        throw new AppError(
          "The advisor changed during generation. Reload to see the saved state.",
          409,
        );
      const strategy = await tx.advisorStrategy.create({
        data: {
          workspaceId: w.id,
          version: 1,
          founderContext: json(w.founderContext),
          output: json(output),
          fixture: advisorConfig().fixture,
          tasks: { create: output.tasks.map((_, position) => ({ position })) },
        },
      });
      await tx.advisorOperation.update({
        where: { id: op.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          usage: json(usage),
          estimatedCost: usage.reduce((n, u) => n + u.estimatedCost, 0),
          output: { strategyId: strategy.id },
        },
      });
      await tx.product.update({
        where: { id: productId },
        data: {
          name:
            (current.profile as { identity?: { name?: string } } | null)
              ?.identity?.name ?? w.product.name,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: t.organizationId,
          actorId: t.userId,
          action: "ADVISOR_STRATEGY_SAVED",
          resourceId: strategy.id,
        },
      });
    });
    return advisorWorkspace(t, productId);
  } catch (error) {
    await failOperation(reserved.operation.id, usage);
    if (error instanceof AppError) throw error;
    throw new AppError(
      "The advisor could not complete this plan. Your answers and existing reports are saved. Save answers again to start a new attempt.",
      502,
    );
  }
}

export async function completeTask(
  t: Tenant,
  productId: string,
  taskId: string,
  completed: boolean,
  expectedVersion: number,
) {
  const w = await advisorWorkspace(t, productId);
  const strategy = w.strategies[0];
  const task = strategy?.tasks.find((x) => x.id === taskId);
  if (!task) throw new AppError("Task not found.", 404);
  const updated = await db().advisorTask.updateMany({
    where: { id: task.id, strategyId: strategy.id, version: expectedVersion },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
      version: { increment: 1 },
    },
  });
  if (!updated.count)
    throw new AppError(
      "This task changed in another window. Reload to see progress.",
      409,
    );
  return db().advisorTask.findUniqueOrThrow({ where: { id: task.id } });
}

export async function assist(
  t: Tenant,
  productId: string,
  input: { strategyId: string; action: "explain" | "task"; taskId?: string },
) {
  const w = await advisorWorkspace(t, productId);
  const strategy = w.strategies[0];
  if (!strategy || strategy.id !== input.strategyId)
    throw new AppError("Saved strategy not found.", 404);
  const task = input.taskId
    ? strategy.tasks.find((x) => x.id === input.taskId)
    : undefined;
  if (
    (input.action === "task" && !task) ||
    (input.action === "explain" && input.taskId)
  )
    throw new AppError("Choose a task from this saved plan.", 400);
  const requestKey = hash({
    ...input,
    completion: strategy.tasks.map((x) => ({ id: x.id, version: x.version })),
  });
  const reserved = await reserve(t, w.id, input.action, requestKey);
  if (reserved.cached)
    return {
      ...(reserved.operation.output as { answer: string }),
      cached: true,
      fixture: strategy.fixture,
    };
  const usage: UsageEntry[] = [];
  try {
    const output = await explainAdvisor(
      {
        action: input.action,
        product: w.profile,
        founderContext: strategy.founderContext,
        authoritativeStrategy: strategy.output,
        selectedTaskPosition: task?.position ?? null,
        completedActivities: strategy.tasks
          .filter((x) => x.completed)
          .map((x) => x.position),
        recordedOutcomes: "No outcome metrics recorded",
      },
      usage,
    );
    const updated = await db().advisorOperation.updateMany({
      where: {
        id: reserved.operation.id,
        status: "RUNNING",
        leaseExpiresAt: { gt: new Date() },
      },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        output: json(output),
        usage: json(usage),
        estimatedCost: usage.reduce((n, u) => n + u.estimatedCost, 0),
      },
    });
    if (!updated.count)
      throw new AppError(
        "This assistance request expired. Your plan is unchanged.",
        409,
      );
    return { ...output, cached: false, fixture: strategy.fixture };
  } catch (error) {
    await failOperation(reserved.operation.id, usage);
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Advisor help is unavailable. Your plan and progress are saved.",
      502,
    );
  }
}

export function advisorView(w: Awaited<ReturnType<typeof advisorWorkspace>>) {
  const s = w.strategies[0];
  const ids = (
    w.profile as { statements?: { id: string }[] } | null
  )?.statements?.map((x) => x.id) ?? ["unknown"];
  return {
    productId: w.productId,
    name: w.product.name,
    websiteUrl: w.product.websiteUrl,
    context: contextSchema.parse(w.founderContext),
    contextVersion: w.version,
    strategy: s
      ? {
          id: s.id,
          version: s.version,
          output: advisorSchema(ids as [string, ...string[]]).parse(s.output),
          fixture: s.fixture,
          createdAt: s.createdAt.toISOString(),
          tasks: s.tasks.map((x) => ({
            id: x.id,
            position: x.position,
            completed: x.completed,
            version: x.version,
          })),
        }
      : null,
  };
}
