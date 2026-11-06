import Link from "next/link";
import { LayoutDashboard, LifeBuoy, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { advisorEnabled } from "@/modules/advisor/config";
export function WorkspaceShell({
  children,
  advisor = false,
}: {
  children: ReactNode;
  product?: boolean;
  advisor?: boolean;
}) {
  return (
    <div
      className={`container workspace-shell${advisor ? " advisor-shell" : ""}`}
    >
      <aside className="workspace-sidebar no-print">
        <nav aria-label="Workspace">
          {advisorEnabled() && (
            <Link href="/advisor" aria-current={advisor ? "page" : undefined}>
              <LayoutDashboard size={17} />
              Acquisition advisor
            </Link>
          )}
          <Link href="/dashboard" aria-current={!advisor ? "page" : undefined}>
            <LayoutDashboard size={17} />
            My plans
          </Link>
          <Link href="/support">
            <LifeBuoy size={17} />
            Help & support
          </Link>
        </nav>
        <div className="workspace-account">
          <span className="badge">Free workspace</span>
          <p className="mt-3 muted">
            A little more focus.
            <br />A better next move.
          </p>
        </div>
      </aside>
      <main className="workspace-content">{children}</main>
    </div>
  );
}
export type WorkspaceProduct = {
  id: string;
  name: string;
  websiteUrl: string;
  status: string;
  approvedVersion: number | null;
  latestStatus: string;
  updatedLabel: string;
};
const statusLabels: Record<string, string> = {
  SUCCEEDED: "Report ready",
  RUNNING: "Building report",
  FAILED: "Needs a retry",
  DRAFT: "Not analysed",
  ACTIVE: "Available",
};
export function WorkspaceOverview({
  products,
  monthly,
  quota,
  form,
  signOut,
  nextAction,
}: {
  products: WorkspaceProduct[];
  monthly: number;
  quota: number;
  form: ReactNode;
  signOut: ReactNode;
  nextAction?: { text: string; productId: string; name: string };
}) {
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="section-kicker">Your acquisition workspace</p>
          <h1>From product to first customers.</h1>
          <p>Pick up your strategy. Make your next move count.</p>
        </div>
        {signOut}
      </div>
      <div className="workspace-stats">
        <div>
          <strong>{products.length}</strong>
          <span>
            {products.length === 1 ? "SaaS product" : "SaaS products"}
          </span>
        </div>
        <div>
          <strong>
            {monthly}
            <span className="inline!"> / {quota}</span>
          </strong>
          <span>reports this month</span>
        </div>
        <div>
          <strong>Free</strong>
          <span>your current plan</span>
        </div>
      </div>
      {nextAction && (
        <section className="next-action">
          <h2>Next move · {nextAction.name}</h2>
          <p>{nextAction.text}</p>
          <Link
            href={`/products/${nextAction.productId}/advisor`}
            className="text-link text-xs"
          >
            Open strategy <ArrowUpRight size={14} />
          </Link>
        </section>
      )}
      <section className="workspace-create">
        <h2>Start your acquisition advisor.</h2>
        {form}
      </section>
      <section className="mt-10" id="products">
        <div className="section-heading mb-5">
          <h2 className="text-2xl!">Your products & strategies</h2>
          <span className="text-xs muted">Saved in your workspace</span>
        </div>
        {!products.length ? (
          <div className="empty-state">
            <h3>Your first move belongs here.</h3>
            <p>
              Add your SaaS website above to create a strategy. Your saved
              reports and future revisions will stay together.
            </p>
          </div>
        ) : (
          <div className="product-list">
            {products.map((p) => (
              <article key={p.id} className="product-row">
                <div>
                  <h3>
                    <Link href={`/products/${p.id}/advisor`}>{p.name}</Link>
                  </h3>
                  <p>{p.websiteUrl}</p>
                </div>
                <div className="product-status">
                  <span className="badge">
                    {statusLabels[p.latestStatus] ??
                      p.latestStatus.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <p className="mt-2">
                    {p.latestStatus === "RUNNING"
                      ? "Your report is building. This page updates automatically."
                      : p.latestStatus === "FAILED"
                        ? p.approvedVersion
                          ? `Latest attempt failed. Approved strategy v${p.approvedVersion} is still available.`
                          : "This attempt failed. Open the product to retry."
                        : p.approvedVersion
                          ? `Approved strategy v${p.approvedVersion}`
                          : p.latestStatus === "SUCCEEDED"
                            ? "Ready for your review"
                            : "Generate a report to get started."}
                  </p>
                </div>
                <p className="product-date">{p.updatedLabel}</p>
                <Link
                  href={`/products/${p.id}/advisor`}
                  aria-label={`Open ${p.name} strategy`}
                >
                  <ArrowUpRight size={18} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
