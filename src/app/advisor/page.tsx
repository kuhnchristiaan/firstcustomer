import Link from "next/link";
import { redirect } from "next/navigation";
import { tenant, AppError } from "@/modules/auth/tenant";
import { db } from "@/lib/db";
import { advisorEnabled } from "@/modules/advisor/config";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SignOut } from "@/components/auth-form";
import { AdvisorStart } from "@/components/advisor-start";
export const dynamic = "force-dynamic";
export default async function AdvisorHome({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  if (!advisorEnabled()) redirect("/dashboard");
  let t;
  try {
    t = await tenant();
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      return (
        <main className="container py-12">
          <div className="advisor-intro">
            <span className="eyebrow">YOUR FREE ACQUISITION ADVISOR</span>
            <h1>Your next seven days, focused.</h1>
            <p className="muted">
              One buyer, one channel and a realistic plan. Expand the reasoning
              when you need it. Start without an account.
            </p>
          </div>
          <AdvisorStart initialUrl={(await searchParams).url} guest />
          <p className="mt-6 text-sm muted">
            Create a free account later to keep your plan, track progress and
            review what happened.
          </p>
          <Link href="/auth/sign-in" className="mt-4 inline-block underline">
            Already have an account? Sign in
          </Link>
        </main>
      );
    throw error;
  }
  const products = await db().product.findMany({
    where: { organizationId: t.organizationId, advisor: { isNot: null } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, name: true, websiteUrl: true },
  });
  return (
    <WorkspaceShell advisor>
      <div className="advisor-intro">
        <span className="eyebrow">YOUR ACQUISITION ADVISOR</span>
        <h1>A focused next move.</h1>
        <p className="muted">
          Turn what your product does into a small, useful acquisition
          experiment.
        </p>
      </div>
      <div className="flex justify-end mb-4">
        <SignOut />
      </div>
      <AdvisorStart initialUrl={(await searchParams).url} />
      {products.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Pick up where you left off</h2>
          <div className="advisor-product-list">
            {products.map((p) => (
              <Link
                className="panel advisor-product"
                key={p.id}
                href={`/products/${p.id}/advisor`}
              >
                <strong>{p.name}</strong>
                <span className="text-sm muted">{p.websiteUrl}</span>
                <span className="text-sm">Open advisor →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <Link href="/dashboard" className="mt-8 inline-block text-sm underline">
        All products & historical reports
      </Link>
    </WorkspaceShell>
  );
}
