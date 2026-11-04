import Link from "next/link";
import { redirect } from "next/navigation";
import { tenant, AppError } from "@/modules/auth/tenant";
import { configured, config } from "@/modules/config/env";
import { db } from "@/lib/db";
import { UrlForm } from "@/components/url-form";
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
      analyses: { orderBy: { startedAt: "desc" }, take: 5 },
      profiles: { orderBy: { version: "desc" }, take: 1 },
    },
  });
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
  return (
    <main className="container py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="eyebrow">FOUNDER WORKSPACE</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            From product to first customers.
          </h1>
        </div>
        <SignOut />
      </div>
      <div className="mb-8 grid gap-5 md:grid-cols-3">
        {[
          ["Your products", products.length],
          ["Reports this month", `${monthly} / ${e.MONTHLY_ANALYSIS_QUOTA}`],
          ["Your plan", "Free"],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <p className="text-xs muted">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2 className="mb-5 text-xl font-semibold">
          Build your next sales strategy
        </h2>
        <UrlForm authenticated initialUrl={url} />
      </section>
      <section className="mt-10">
        <h2 className="mb-5 text-xl font-semibold">Your products & reports</h2>
        {!products.length ? (
          <div className="panel text-center">
            <p className="my-8 muted">
              Your first sales plan belongs here. Add your SaaS website above to
              get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {products.map((p) => (
              <article className="panel" key={p.id}>
                <div className="flex justify-between">
                  <span className="badge">{p.status}</span>
                  <span className="text-xs muted">
                    {p.profiles[0]
                      ? `Approved v${p.profiles[0].version}`
                      : "Awaiting review"}
                  </span>
                </div>
                <Link
                  href={`/products/${p.id}`}
                  className="mt-5 block text-xl font-semibold hover:underline"
                >
                  {p.name}
                </Link>
                <p className="mt-2 truncate text-sm muted">{p.websiteUrl}</p>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  {p.analyses.map((a) => (
                    <p key={a.id} className="mt-2 text-xs muted">
                      {a.startedAt.toLocaleDateString("en-ZA")} · {a.status} ·{" "}
                      {a.provider === "mock" ? "SAMPLE" : a.model}
                      {a.error && ` · ${a.error}`}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
