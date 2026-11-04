import { strategyEnabled } from "@/modules/strategy/feature";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { guestConfig } from "./config";
import { tokenHash, newGuestToken } from "./security";
import { normalizeUrl } from "@/modules/website/safe-fetch";
import { executeAnalysis } from "@/modules/analysis/execute";
import { config } from "@/modules/config/env";
import { metric } from "@/modules/analytics/service";
import type { Prisma } from "@/generated/prisma/client";
const unavailable = () =>
  new AppError("This guest report is unavailable or has expired.", 404);
export async function sessionFromToken(token: string | undefined) {
  const hash = tokenHash(token);
  const session = await db().guestAnalysisSession.findUnique({
    where: { tokenHash: hash },
  });
  if (!session || session.expiresAt <= new Date()) throw unavailable();
  return session;
}
export async function createGuestSession(
  existing: string | undefined,
  ipHash: string,
) {
  const e = guestConfig();
  if (existing)
    try {
      const session = await sessionFromToken(existing);
      return { session, token: existing };
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
    }
  const token = newGuestToken();
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const expiry = new Date(now.getTime() + 48 * 3600000);
  const session = await db().$transaction(
    async (tx) => {
      await lockAdmission(tx);
      await increment(
        tx,
        `guest:sessions:${day}`,
        e.GUEST_DAILY_CAP * 10,
        expiry,
        "Free report visits are busy today. Please try again tomorrow.",
      );
      await increment(
        tx,
        `guest:sessions:ip:${day}:${ipHash}`,
        10,
        expiry,
        "Too many guest sessions from this network. Please try again tomorrow.",
      );
      return tx.guestAnalysisSession.create({
        data: {
          tokenHash: tokenHash(token),
          expiresAt: new Date(now.getTime() + e.GUEST_TTL_HOURS * 3600000),
        },
      });
    },
    { maxWait: 10000, timeout: 15000 },
  );
  return { session, token };
}
export async function lockAdmission(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`INSERT INTO "UsageBucket" ("key","count","expiresAt") VALUES ('guest:admission',0,TIMESTAMP '2100-01-01') ON CONFLICT ("key") DO NOTHING`;
  await tx.$queryRaw`SELECT key FROM "UsageBucket" WHERE key='guest:admission' FOR UPDATE`;
}
export async function increment(
  tx: Prisma.TransactionClient,
  key: string,
  limit: number,
  expiresAt: Date,
  message: string,
) {
  const bucket = await tx.usageBucket.upsert({
    where: { key },
    create: { key, count: 0, expiresAt },
    update: {},
  });
  if (bucket.count >= limit) throw new AppError(message, 429);
  await tx.usageBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
}
export async function reserveGuestAnalysis(
  token: string | undefined,
  input: string,
  ipHash: string,
) {
  const e = guestConfig();
  const settings = config();
  const hash = tokenHash(token);
  const websiteUrl = normalizeUrl(input);
  return db().$transaction(
    async (tx) => {
      // One short global admission lock protects all quota checks/reservations across instances.
      await lockAdmission(tx);
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const hour = now.toISOString().slice(0, 13);
      const expiry = new Date(now.getTime() + 48 * 3600000);
      const session = await tx.guestAnalysisSession.findUnique({
        where: { tokenHash: hash },
      });
      if (!session || session.expiresAt <= new Date()) throw unavailable();
      if (session.claimedAt)
        throw new AppError(
          "Your strategy is already saved. Open it from your workspace.",
          409,
        );
      if (session.expiresAt.getTime() - Date.now() < 150000)
        throw new AppError(
          "This guest session is about to expire. Please try again after it expires.",
          409,
        );
      await tx.analysisRun.updateMany({
        where: {
          guestSessionId: { not: null },
          productId: null,
          status: "RUNNING",
          leaseExpiresAt: { lte: now },
        },
        data: {
          status: "FAILED",
          completedAt: now,
          error: "Processing deadline exceeded.",
        },
      });
      const ownRuns = await tx.analysisRun.findMany({
        where: { guestSessionId: session.id },
        select: { status: true },
      });
      if (ownRuns.some((r) => r.status === "SUCCEEDED"))
        throw new AppError(
          "Your free strategy is ready. Continue reading or save it with a free account.",
          409,
        );
      if (ownRuns.some((r) => r.status === "RUNNING"))
        throw new AppError(
          "Your strategy is already processing. Please wait.",
          409,
        );
      if (ownRuns.length >= e.GUEST_MAX_ATTEMPTS)
        throw new AppError(
          "Your guest attempt limit has been reached. Please try again after this guest session expires.",
          429,
        );
      let running = await tx.analysisRun.count({
        where: {
          guestSessionId: { not: null },
          productId: null,
          status: "RUNNING",
          leaseExpiresAt: { gt: now },
        },
      });
      if (strategyEnabled())
        running += await tx.strategyRevision.count({
          where: {
            analysis: { productId: null, guestSessionId: { not: null } },
            status: "RUNNING",
            leaseExpiresAt: { gt: now },
          },
        });
      if (running >= e.GUEST_MAX_CONCURRENT)
        throw new AppError(
          "Free reports are busy right now. Please try again shortly.",
          429,
        );
      await increment(
        tx,
        `guest:daily:${day}`,
        e.GUEST_DAILY_CAP,
        expiry,
        "Today’s free report limit has been reached. Please come back tomorrow.",
      );
      await increment(
        tx,
        `guest:ip:day:${day}:${ipHash}`,
        e.GUEST_IP_DAILY_ATTEMPTS,
        expiry,
        "Your network’s free report limit has been reached. Please try again tomorrow.",
      );
      await increment(
        tx,
        `guest:ip:hour:${hour}:${ipHash}`,
        e.GUEST_IP_HOURLY_ATTEMPTS,
        expiry,
        "Too many free report attempts from this network. Please try again later.",
      );
      await tx.guestAnalysisSession.update({
        where: { id: session.id },
        data: { websiteUrl },
      });
      const run = await tx.analysisRun.create({
        data: {
          guestSessionId: session.id,
          status: "RUNNING",
          leaseExpiresAt: new Date(now.getTime() + 140000),
          provider: settings.MOCK_ANALYSIS === "true" ? "mock" : "openai",
          model:
            settings.MOCK_ANALYSIS === "true"
              ? "fixture-v1"
              : settings.OPENAI_MODEL,
        },
      });
      await metric("guest_analysis_start", tx);
      return { runId: run.id, websiteUrl };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export async function generateGuest(
  token: string | undefined,
  input: string,
  ipHash: string,
) {
  const e = guestConfig();
  const reserved = await reserveGuestAnalysis(token, input, ipHash);
  await executeAnalysis(reserved.runId, null, reserved.websiteUrl, {
    pages: e.GUEST_MAX_PAGES,
    chars: Math.min(4000, Math.floor((e.GUEST_MAX_INPUT_TOKENS - 16000) / 4)),
    inputTokens: e.GUEST_MAX_INPUT_TOKENS,
    outputTokens: e.GUEST_MAX_OUTPUT_TOKENS,
    inputRate: e.GUEST_INPUT_USD_PER_MILLION,
    outputRate: e.GUEST_OUTPUT_USD_PER_MILLION,
  });
}
export async function readGuest(token: string | undefined) {
  const session = await sessionFromToken(token);
  if (session.claimedAt) throw unavailable();
  const run = await db().analysisRun.findFirst({
    where: { guestSessionId: session.id, productId: null },
    orderBy: { startedAt: "desc" },
  });
  if (!run)
    return {
      status: "EMPTY",
      output: null,
      expiresAt: session.expiresAt,
      error: null,
      mock: false,
    };
  const stale = run.status === "RUNNING" && run.leaseExpiresAt <= new Date();
  return {
    status: stale ? "FAILED" : run.status,
    output: run.status === "SUCCEEDED" ? run.output : null,
    expiresAt: session.expiresAt,
    error: stale ? "Processing timed out. Please try again." : run.error,
    mock: run.provider === "mock",
  };
}
export async function claimGuest(
  token: string | undefined,
  t: { organizationId: string; userId: string },
) {
  const hash = tokenHash(token);
  const now = new Date();
  return db().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "GuestAnalysisSession" WHERE "tokenHash"=${hash} FOR UPDATE`;
      const session = await tx.guestAnalysisSession.findUnique({
        where: { tokenHash: hash },
      });
      if (!session || session.expiresAt <= new Date()) throw unavailable();
      const member = await tx.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: t.organizationId,
            userId: t.userId,
          },
        },
      });
      if (
        !member ||
        member.status !== "ACTIVE" ||
        !["OWNER", "ADMIN", "MEMBER"].includes(member.role)
      )
        throw new AppError("Workspace access is unavailable.", 403);
      if (session.claimedAt) {
        if (session.claimedOrganizationId !== t.organizationId)
          throw unavailable();
        const run = await tx.analysisRun.findFirstOrThrow({
          where: {
            guestSessionId: session.id,
            productId: session.claimedProductId,
            status: "SUCCEEDED",
          },
        });
        return { productId: session.claimedProductId!, analysisId: run.id };
      }
      const run = await tx.analysisRun.findFirst({
        where: {
          guestSessionId: session.id,
          productId: null,
          status: "SUCCEEDED",
        },
        orderBy: { startedAt: "desc" },
      });
      if (!run?.output)
        throw new AppError("Your strategy is not ready to save yet.", 409);
      const name =
        typeof run.output === "object" &&
        !Array.isArray(run.output) &&
        typeof run.output.businessName === "string"
          ? run.output.businessName
          : new URL(session.websiteUrl).hostname;
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${t.organizationId} FOR UPDATE`;
      const product = await tx.product.upsert({
        where: {
          organizationId_websiteUrl: {
            organizationId: t.organizationId,
            websiteUrl: session.websiteUrl,
          },
        },
        create: {
          organizationId: t.organizationId,
          websiteUrl: session.websiteUrl,
          name,
        },
        update: {},
      });
      await tx.analysisRun.update({
        where: { id: run.id },
        data: { productId: product.id },
      });
      await tx.websiteSource.updateMany({
        where: { analysisId: run.id, productId: null },
        data: { productId: product.id },
      });
      await tx.guestAnalysisSession.update({
        where: { id: session.id },
        data: {
          claimedAt: now,
          claimedOrganizationId: t.organizationId,
          claimedByUserId: t.userId,
          claimedProductId: product.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: t.organizationId,
          actorId: t.userId,
          action: "GUEST_REPORT_CLAIMED",
          resourceId: run.id,
        },
      });
      await metric("report_claimed", tx);
      return { productId: product.id, analysisId: run.id };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
