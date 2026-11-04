import { db } from "@/lib/db";
import { config } from "@/modules/config/env";
import { AppError, ownedProduct } from "@/modules/auth/tenant";
import { normalizeUrl } from "@/modules/website/safe-fetch";
import { executeAnalysis } from "./execute";
import { strategyEnabled } from "@/modules/strategy/feature";
import { enforceLimits } from "@/modules/usage/limits";
import { reportSchema, validateEvidence } from "@/modules/intelligence/schema";
export type Tenant = { organizationId: string; userId: string };
export async function generate(t: Tenant, input: string) {
  const e = config();
  const websiteUrl = normalizeUrl(input);
  const p = db();
  const now = new Date();
  const reserved = await p.$transaction(
    async (tx) => {
      // Lock the tenant row: quota check + reservation are atomic across serverless instances.
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${t.organizationId} FOR UPDATE`;
      await tx.analysisRun.updateMany({
        where: {
          product: { organizationId: t.organizationId },
          status: "RUNNING",
          leaseExpiresAt: { lt: now },
        },
        data: {
          status: "FAILED",
          error: "Processing deadline exceeded.",
          completedAt: now,
        },
      });
      const scope = { product: { organizationId: t.organizationId } };
      let [monthly, running, recent] = await Promise.all([
        tx.analysisRun.count({
          where: {
            ...scope,
            startedAt: {
              gte: new Date(
                Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
              ),
            },
          },
        }),
        tx.analysisRun.count({ where: { ...scope, status: "RUNNING" } }),
        tx.analysisRun.count({
          where: {
            ...scope,
            startedAt: { gte: new Date(now.getTime() - 60000) },
          },
        }),
      ]);
      if (strategyEnabled()) {
        const revisionScope = {
          analysis: { product: { organizationId: t.organizationId } },
        };
        monthly += await tx.strategyRevision.count({
          where: {
            ...revisionScope,
            createdAt: {
              gte: new Date(
                Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
              ),
            },
          },
        });
        running += await tx.strategyRevision.count({
          where: {
            ...revisionScope,
            status: "RUNNING",
            leaseExpiresAt: { gt: now },
          },
        });
        recent += await tx.strategyRevision.count({
          where: {
            ...revisionScope,
            createdAt: { gte: new Date(now.getTime() - 60000) },
          },
        });
      }
      enforceLimits(
        { monthly, running, recent },
        {
          monthly: e.MONTHLY_ANALYSIS_QUOTA,
          concurrent: e.MAX_CONCURRENT_ANALYSES,
        },
      );
      const duplicate = await tx.analysisRun.findFirst({
        where: {
          ...scope,
          product: { organizationId: t.organizationId, websiteUrl },
          status: "SUCCEEDED",
          startedAt: { gte: new Date(now.getTime() - 60000) },
        },
      });
      if (duplicate)
        throw new AppError(
          "A report was just generated for this website. Open it from your dashboard.",
          409,
        );
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
      const run = await tx.analysisRun.create({
        data: {
          productId: product.id,
          leaseExpiresAt: new Date(now.getTime() + 140000),
          provider: e.MOCK_ANALYSIS === "true" ? "mock" : "openai",
          model: e.MOCK_ANALYSIS === "true" ? "fixture-v1" : e.OPENAI_MODEL,
        },
      });
      return { product, run };
    },
    { timeout: 15000 },
  );
  await executeAnalysis(
    reserved.run.id,
    reserved.product.id,
    websiteUrl,
    undefined,
    t,
  );
  return reserved.product.id;
}

export async function approve(
  t: Tenant,
  productId: string,
  analysisId: string,
  input: unknown,
  expectedVersion: number,
) {
  await ownedProduct(t.organizationId, productId);
  const findings = reportSchema.parse(input);
  const p = db();
  return p.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} AND "organizationId" = ${t.organizationId} FOR UPDATE`;
    const analysis = await tx.analysisRun.findFirst({
      where: { id: analysisId, productId, status: "SUCCEEDED" },
      include: { sources: true },
    });
    if (!analysis) throw new AppError("Completed report not found.", 404);
    validateEvidence(
      findings,
      analysis.sources.map((s) => s.url),
    );
    const latest = await tx.productProfile.findFirst({
      where: { productId },
      orderBy: { version: "desc" },
    });
    if ((latest?.version ?? 0) !== expectedVersion)
      throw new AppError(
        "This profile changed in another window. Reload before saving.",
        409,
      );
    const profile = await tx.productProfile.create({
      data: {
        productId,
        analysisId,
        version: expectedVersion + 1,
        businessDescription: findings.overview.text,
        mainOffering: findings.offerings.map((o) => o.text).join("\n"),
        industry: findings.industries.map((i) => i.text).join(", "),
        valueProposition: findings.valueProposition.text,
        geographicFocus: findings.geographicFocus.text,
        approvedBy: t.userId,
        findings,
        segments: {
          create: findings.segments.map((s) => ({
            ...s,
            evidence: s.evidence,
          })),
        },
      },
    });
    await tx.product.update({
      where: { id: productId },
      data: { status: "APPROVED", description: findings.overview.text },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: t.organizationId,
        actorId: t.userId,
        action: "PROFILE_APPROVED",
        resourceId: profile.id,
      },
    });
    return profile;
  });
}
