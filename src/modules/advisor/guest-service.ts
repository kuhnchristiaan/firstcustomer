import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";
import { guestConfig } from "@/modules/guest/config";
import {
  reserveGuestAnalysis,
  sessionFromToken,
} from "@/modules/guest/service";
import { advisorConfig } from "./config";
import { generateAdvisor, type UsageEntry } from "./provider";
import { contextSchema, emptyContext, type FounderContext } from "./schema";
import { parseGuestAdvisor } from "./guest-contract";
import type { advisorView } from "./service";
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

export async function generateGuestAdvisor(
  token: string | undefined,
  url: string,
  rawContext: unknown,
  ipHash: string,
) {
  const context = contextSchema.parse(rawContext);
  const g = guestConfig(),
    a = advisorConfig();
  if (!a.fixture && a.ADVISOR_LIVE_ENABLED !== "true")
    throw new AppError("Live advisor calls are currently unavailable.", 503);
  const cost = Math.min(g.GUEST_MAX_COST_USD, a.strategyCeiling);
  const reserved = await reserveGuestAnalysis(token, url, ipHash, {
    cost,
    model: a.ADVISOR_STRATEGY_MODEL,
  });
  const usage: UsageEntry[] = [];
  try {
    let profile: unknown = null,
      sources: unknown = null;
    const strategy = await generateAdvisor(
      { url: reserved.websiteUrl, context, profile, sources },
      usage,
      async (p, s) => {
        profile = p;
        sources = s;
      },
      {
        cost,
        inputTokens: g.GUEST_MAX_INPUT_TOKENS,
        outputTokens: g.GUEST_MAX_OUTPUT_TOKENS,
        pages: g.GUEST_MAX_PAGES,
        chars: 20000,
      },
    );
    const output = parseGuestAdvisor({
      kind: "guest-advisor/1",
      context,
      profile,
      sources,
      strategy,
      fixture: a.fixture,
      usage,
    });
    const saved = await db().analysisRun.updateMany({
      where: {
        id: reserved.runId,
        status: "RUNNING",
        productId: null,
        leaseExpiresAt: { gt: new Date() },
      },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        output: json(output),
        inputTokens: usage.reduce((n, u) => n + u.inputTokens, 0),
        outputTokens: usage.reduce((n, u) => n + u.outputTokens, 0),
        estimatedCost: usage.reduce((n, u) => n + u.estimatedCost, 0),
      },
    });
    if (!saved.count)
      throw new AppError("This attempt expired. No plan was published.", 409);
  } catch (error) {
    await db().analysisRun.updateMany({
      where: { id: reserved.runId, status: "RUNNING" },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        inputTokens: usage.reduce((n, u) => n + u.inputTokens, 0),
        outputTokens: usage.reduce((n, u) => n + u.outputTokens, 0),
        estimatedCost: usage.reduce((n, u) => n + u.estimatedCost, 0),
        error:
          "The advisor could not complete this plan. No plan was published.",
      },
    });
    if (error instanceof AppError) throw error;
    throw new AppError(
      "The advisor could not complete this plan. Your saved plans are unchanged.",
      502,
    );
  }
  return readGuestAdvisor(token);
}

export function emptyGuestAdvisor(
  url: string,
  context: FounderContext = structuredClone(emptyContext),
): ReturnType<typeof advisorView> {
  return {
    productId: "guest",
    name: "Your acquisition plan",
    websiteUrl: url,
    context,
    contextVersion: 0,
    strategy: null,
  };
}

export async function readGuestAdvisor(token: string | undefined) {
  const session = await sessionFromToken(token);
  if (session.claimedAt)
    return {
      status: "CLAIMED",
      data: null,
      error: null,
      expiresAt: session.expiresAt,
    };
  const run = await db().analysisRun.findFirst({
    where: { guestSessionId: session.id, productId: null },
    orderBy: { startedAt: "desc" },
  });
  if (run && run.provider !== "guest-advisor")
    return {
      status: "LEGACY",
      data: null,
      error: null,
      expiresAt: session.expiresAt,
    };
  if (run?.status === "SUCCEEDED") {
    const value = parseGuestAdvisor(run.output);
    const data: ReturnType<typeof advisorView> = {
      productId: "guest",
      name: value.profile.identity.name,
      websiteUrl: session.websiteUrl,
      context: value.context,
      contextVersion: 0,
      strategy: {
        id: run.id,
        version: 1,
        strategyVersion: 1,
        output: value.strategy,
        fixture: value.fixture,
        createdAt: run.startedAt.toISOString(),
        tasks: value.strategy.tasks.map((_, position) => ({
          id: `guest-${position}`,
          position,
          completed: false,
          version: 0,
        })),
      },
    };
    return {
      status: "SUCCEEDED",
      data,
      error: null,
      expiresAt: session.expiresAt,
    };
  }
  const stale = run?.status === "RUNNING" && run.leaseExpiresAt <= new Date();
  return {
    status: stale ? "FAILED" : (run?.status ?? "EMPTY"),
    data: emptyGuestAdvisor(session.websiteUrl),
    error: stale
      ? "This attempt expired. No plan was published."
      : (run?.error ?? null),
    expiresAt: session.expiresAt,
  };
}
