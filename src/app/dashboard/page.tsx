import Link from "next/link";
import { redirect } from "next/navigation";
import { tenant, AppError } from "@/modules/auth/tenant";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdvisorStart } from "@/components/advisor-start";
import { SignOut } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  let t;
  try {
    t = await tenant();
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      redirect("/auth/sign-in");
    throw error;
  }
  const products = await db().product.findMany({
    where: { organizationId: t.organizationId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      advisor: { select: { strategies: { take: 1, select: { id: true } } } },
    },
  });
  return (
    <WorkspaceShell>
      <div className="workspace-heading">
        <div>
          <p className="section-kicker">Your acquisition workspace</p>
          <h1>Your plans</h1>
          <p>Pick up your strategy and make your next move count.</p>
        </div>
        <SignOut />
      </div>
      <section className="workspace-create">
        <h2>Start an acquisition advisor</h2>
        <AdvisorStart />
      </section>
      <section className="mt-10" id="products">
        <div className="section-heading mb-5">
          <h2>Your products & strategies</h2>
          <span className="text-xs muted">Saved in your workspace</span>
        </div>
        {!products.length ? (
          <div className="empty-state">
            <h3>Your first move belongs here.</h3>
            <p>Add your SaaS website above to start your plan.</p>
          </div>
        ) : (
          <div className="product-list">
            {products.map((p) => {
              const hasAdvisor = Boolean(p.advisor);
              const ready = Boolean(p.advisor?.strategies.length);
              const href = hasAdvisor
                ? `/products/${p.id}/advisor`
                : `/advisor?url=${encodeURIComponent(p.websiteUrl)}`;
              return (
                <article key={p.id} className="product-row">
                  <div>
                    <h3>
                      <Link href={href}>{p.name}</Link>
                    </h3>
                    <p>{p.websiteUrl}</p>
                  </div>
                  <div className="product-status">
                    <span className="badge">
                      {ready
                        ? "Plan ready"
                        : hasAdvisor
                          ? "Continue setup"
                          : "Start advisor"}
                    </span>
                    <p className="mt-2">
                      {ready
                        ? "Your acquisition plan is ready."
                        : hasAdvisor
                          ? "Complete your founder context to create a plan."
                          : "Start an advisor for this product."}
                    </p>
                  </div>
                  <Link href={href} aria-label={`Open ${p.name} advisor`}>
                    Open advisor →
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
