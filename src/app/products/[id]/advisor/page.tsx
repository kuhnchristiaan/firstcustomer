import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { tenant, AppError, ownedProduct } from "@/modules/auth/tenant";
import { advisorEnabled } from "@/modules/advisor/config";
import { advisorWorkspace, advisorView } from "@/modules/advisor/service";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AdvisorClient } from "@/components/advisor-client";
export const dynamic = "force-dynamic";
export default async function ProductAdvisor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!advisorEnabled()) redirect("/dashboard");
  let t;
  try {
    t = await tenant();
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      redirect("/auth/sign-in");
    throw error;
  }
  const { id } = await params;
  let w;
  try {
    w = await advisorWorkspace(t, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      let product;
      try {
        product = await ownedProduct(t.organizationId, id);
      } catch {
        notFound();
      }
      redirect(`/advisor?url=${encodeURIComponent(product.websiteUrl)}`);
    }
    throw error;
  }
  return (
    <WorkspaceShell product advisor>
      <Link href="/advisor" className="mb-6 inline-block text-sm muted">
        ← Your advisors
      </Link>
      <AdvisorClient initial={advisorView(w)} />
      <Link href="/dashboard" className="mt-8 inline-block text-sm underline">
        All my plans
      </Link>
    </WorkspaceShell>
  );
}
