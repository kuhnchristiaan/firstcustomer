import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportView } from "@/components/report";
import { Button } from "@/components/ui/button";
import { mockReport } from "@/modules/analysis/mock";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (url) redirect(`/?url=${encodeURIComponent(url.slice(0, 2048))}`);
  return (
    <main className="container py-12">
      <section className="sample-banner">
        <p className="eyebrow">ILLUSTRATIVE SAMPLE</p>
        <h1 className="my-3 text-3xl font-semibold">
          A smaller plan. A clearer first move.
        </h1>
        <p className="mb-5 text-sm leading-7">
          This is a sample report. Enter your own SaaS website to generate a
          personalised strategy — no account required. No website was analysed
          for this example.
        </p>
        <Button asChild>
          <Link href="/">Plan for my SaaS</Link>
        </Button>
      </section>
      <section className="report-section panel">
        <h2>The recommendation in one minute</h2>
        <p className="text-sm leading-7">
          Launchboard is an illustrative onboarding analytics SaaS. Start with
          founder-led teams that have trials but cannot explain why users fail
          to activate. Confirm that problem in conversation before investing in
          ads or a content programme.
        </p>
      </section>
      <section className="report-first-move">
        <h2>Your Recommended First Move</h2>
        <p className="mb-4 text-sm leading-7">
          Spend 45 minutes choosing two founders from your existing network and
          inviting them to a short conversation about their last failed trial.
          Ask which onboarding step they suspect, what they have tried, and who
          would approve paying to fix it.
        </p>
        <p className="text-sm leading-7">
          Say: “Where do new users get stuck today, and how do you investigate
          it?” Continue if a founder describes an urgent problem and agrees to
          explore a buying next step. If both say it is low priority, narrow the
          audience before contacting more people.
        </p>
        <p className="mt-4 text-xs muted">
          Hypothesis — needs validation. Two contacts is a planning target, not
          a conversion forecast. This assumes access to relevant founders; none
          have been discovered.
        </p>
      </section>
      <p className="mb-6 text-sm leading-7 muted">
        Decision gate: proceed to the next week only when the earlier experiment
        confirms an urgent problem and an agreed next step. Counts below are
        optional planning targets; stop and narrow the segment if the first two
        conversations show low priority. A trial or free signup is not a paying
        customer.
      </p>
      <ReportView
        initial={mockReport}
        mock
        sections={[
          "segments",
          "acquisitionChannels",
          "thirtyDayPlan",
          "outreachTemplates",
          "missingInformation",
        ]}
      />
    </main>
  );
}
