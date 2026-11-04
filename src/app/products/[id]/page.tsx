import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { tenant, ownedProduct, AppError } from "@/modules/auth/tenant";
import { db } from "@/lib/db";
import { ProgressiveReport } from "@/components/progressive-report";
import { UrlForm } from "@/components/url-form";
import { reportSchema } from "@/modules/intelligence/schema";
import { strategyEnabled } from "@/modules/strategy/feature";
export const dynamic = "force-dynamic";
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string; draft?: string }>;
}) {
  let t;
  try {
    t = await tenant();
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect("/auth/sign-in");
    throw e;
  }
  const { id } = await params;
  try {
    await ownedProduct(t.organizationId, id);
  } catch {
    notFound();
  }
  const p = await db().product.findFirstOrThrow({
    where: { id, organizationId: t.organizationId },
    include: {
      analyses: { orderBy: { startedAt: "desc" }, include: { sources: true } },
      profiles: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  const q = await searchParams;
  const profile = p.profiles[0];
  const strategyApproval =
    strategyEnabled() && !q.run && !q.draft
      ? await db().strategyApproval.findFirst({
          where: {
            productId: id,
            revision: {
              analysis: { product: { organizationId: t.organizationId } },
            },
          },
          orderBy: { createdAt: "desc" },
          include: { revision: { select: { analysisId: true } } },
        })
      : null;
  const analysis = q.run
    ? p.analyses.find((a) => a.id === q.run)
    : strategyApproval
      ? p.analyses.find((a) => a.id === strategyApproval.revision.analysisId)
      : profile && !q.draft
        ? p.analyses.find((a) => a.id === profile.analysisId)
        : p.analyses.find((a) => a.status === "SUCCEEDED");
  const output =
    profile &&
    !q.draft &&
    !q.run &&
    (!strategyApproval ||
      profile.analysisId === strategyApproval.revision.analysisId)
      ? profile.findings
      : analysis?.output;
  return (
    <main className="container py-10">
      <Link href="/dashboard" className="no-print mb-7 block text-sm muted">
        ← Back to workspace
      </Link>
      {output && analysis ? (
        <ProgressiveReport
          key={analysis.id + (q.draft || "") + (q.run || "")}
          initial={reportSchema.parse(output)}
          productId={p.id}
          analysisId={analysis.id}
          version={profile?.version ?? 0}
          mock={analysis.provider === "mock"}
        />
      ) : (
        <div className="panel">
          <h1 className="text-2xl font-semibold">
            Your report isn’t ready yet.
          </h1>
          <p className="mt-4 muted">
            {p.analyses[0]?.error ||
              "Processing may still be in progress. Refresh to check its status."}
          </p>
        </div>
      )}
      <section className="panel no-print mt-8">
        <h2 className="mb-4 text-xl font-semibold">Analysis history</h2>
        <p className="mb-4 text-sm muted">
          Re-analysis creates a new draft. Your approved strategy stays
          available.
        </p>
        {profile && (
          <Link
            href={`/products/${id}`}
            className="mb-3 block text-sm underline"
          >
            Open current approved strategy (v{profile.version})
          </Link>
        )}
        {p.analyses.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap justify-between gap-2 border-t border-slate-100 py-3 text-xs"
          >
            <span>
              {a.startedAt.toLocaleString("en-ZA")} · {a.status} · {a.provider}
            </span>
            <span>
              {a.inputTokens + a.outputTokens} tokens ·{" "}
              {a.estimatedCost === null
                ? "Cost unavailable"
                : `~$${a.estimatedCost.toString()}`}
            </span>
            {a.status === "SUCCEEDED" && (
              <Link href={`/products/${id}?run=${a.id}`} className="underline">
                Review generated draft
              </Link>
            )}
          </div>
        ))}
        <div className="mt-6">
          <UrlForm authenticated initialUrl={p.websiteUrl} />
        </div>
      </section>
    </main>
  );
}
