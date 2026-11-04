import Link from "next/link";
import { ReportView } from "@/components/report";
import { Button } from "@/components/ui/button";
import { mockReport } from "@/modules/analysis/mock";
import { normalizeUrl } from "@/modules/website/safe-fetch";
import { redirect } from "next/navigation";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url = "" } = await searchParams;
  if (url) redirect(`/?url=${encodeURIComponent(url.slice(0, 2048))}`);
  let normalized = "";
  let error = "";
  if (url)
    try {
      normalized = normalizeUrl(url);
    } catch {
      error = "Enter a public HTTP or HTTPS website URL to continue.";
    }
  return (
    <main className="container py-12">
      <div className="panel mb-9 border-teal-200 bg-teal-50">
        <p className="eyebrow">YOUR FIRST LOOK</p>
        <h1 className="mt-3 text-2xl font-semibold">
          A practical plan, built around your SaaS.
        </h1>
        <p className="my-4 max-w-3xl text-sm leading-7">
          {normalized ? `Website submitted: ${normalized}. ` : ""}This anonymous
          preview shows the report format using illustrative sample data. Your
          website has not been fetched or analyzed. Create a free account to
          generate your complete free strategy without an account.
        </p>
        {error ? (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        ) : (
          <Button asChild>
            <Link href="/">Generate My Free Sales Strategy</Link>
          </Button>
        )}
      </div>
      <ReportView initial={mockReport} mock />
      <div className="panel mt-7 text-center">
        <h2 className="text-xl font-semibold">
          Your full report goes from insight to action.
        </h2>
        <p className="mx-auto my-4 max-w-xl text-sm leading-7 muted">
          Your full free report includes all nine sections: customer profiles,
          pain points, positioning, channel experiments, outreach templates, a
          first-10-customers playbook and a 30-day action plan.
        </p>
        <Button asChild>
          <Link href="/">Generate My Free Sales Strategy</Link>
        </Button>
      </div>
    </main>
  );
}
