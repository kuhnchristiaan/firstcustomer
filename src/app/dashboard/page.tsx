import Link from "next/link";
import { redirect } from "next/navigation";
import { tenant, AppError } from "@/modules/auth/tenant";
import { configured, config } from "@/modules/config/env";
import { db } from "@/lib/db";
import { UrlForm } from "@/components/url-form";
import {
  WorkspaceShell,
  WorkspaceOverview,
} from "@/components/workspace-shell";
import { reportSchema } from "@/modules/intelligence/schema";
import { strategySchema } from "@/modules/strategy/schema";
import { strategyEnabled } from "@/modules/strategy/feature";
import { safeInitialReport } from "@/modules/strategy/claims";
import { WorkspaceRefresh } from "@/components/workspace-refresh";
import { activeAnalysis, analysisStatus } from "@/modules/analysis/status";
import { SignOut } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  if (!configured())
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-semibold">
          Your workspace is almost ready.
        </h1>
        <p className="my-5 muted">
          Connect FirstCustomers-specific Neon Auth and PostgreSQL to enable
          accounts and saved reports.
        </p>
        <Link href="/preview" className="underline">
          Explore the sample strategy
        </Link>
      </main>
    );
  let t;
  try {
    t = await tenant();
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect("/auth/sign-in");
    throw e;
  }
  const products = await db().product.findMany({
    where: { organizationId: t.organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      analyses: {
        orderBy: { startedAt: "desc" },
        take: 5,
        select: { id: true, status: true, leaseExpiresAt: true },
      },
      profiles: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  const now = new Date();
  const processingProduct = products.find((p) =>
    p.analyses.some((a) => activeAnalysis(a, now)),
  );
  const e = config();
  const monthly = await db().analysisRun.count({
    where: {
      product: { organizationId: t.organizationId },
      startedAt: {
        gte: new Date(
          Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
        ),
      },
    },
  });
  const { url = "" } = await searchParams;
  const approvals =
    strategyEnabled() && products.length
      ? await db().strategyApproval.findMany({
          where: {
            productId: { in: products.map((p) => p.id) },
            revision: {
              analysis: { product: { organizationId: t.organizationId } },
            },
          },
          orderBy: { createdAt: "desc" },
          distinct: ["productId"],
          select: {
            productId: true,
            revision: { select: { version: true, output: true } },
          },
        })
      : [];
  const refined = new Map(approvals.map((a) => [a.productId, a.revision]));
  const nextProduct = products.find((p) => refined.has(p.id) || p.profiles[0]);
  const savedStrategy = strategySchema.safeParse(
    nextProduct ? refined.get(nextProduct.id)?.output : undefined,
  );
  const savedReport = reportSchema.safeParse(
    nextProduct?.profiles[0]?.findings,
  );
  const nextStep =
    savedStrategy.success && savedStrategy.data.schemaVersion === "3.0"
      ? savedStrategy.data.firstMove.action
      : savedReport.success
        ? safeInitialReport(savedReport.data, []).firstTenPlaybook[0]?.steps[0]
        : undefined;
  return (
    <WorkspaceShell>
      <WorkspaceRefresh active={Boolean(processingProduct)} />
      <WorkspaceOverview
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          websiteUrl: p.websiteUrl,
          status: p.status,
          approvedVersion:
            refined.get(p.id)?.version ?? p.profiles[0]?.version ?? null,
          latestStatus: analysisStatus(p.analyses[0], now) ?? p.status,
          updatedLabel: p.updatedAt.toLocaleDateString("en-ZA", {
            month: "short",
            day: "numeric",
          }),
        }))}
        monthly={monthly}
        quota={e.MONTHLY_ANALYSIS_QUOTA}
        form={
          <UrlForm
            authenticated
            initialUrl={url}
            processing={Boolean(processingProduct)}
            processingHref={
              processingProduct
                ? `/products/${processingProduct.id}`
                : undefined
            }
          />
        }
        signOut={<SignOut />}
        nextAction={
          nextStep && nextProduct
            ? {
                text: nextStep,
                productId: nextProduct.id,
                name: nextProduct.name,
              }
            : undefined
        }
      />
    </WorkspaceShell>
  );
}
