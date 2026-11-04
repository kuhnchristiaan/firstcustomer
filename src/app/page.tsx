import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Target,
  MessageSquare,
  CalendarDays,
  Route,
} from "lucide-react";
import { UrlForm } from "@/components/url-form";
import { LandingMetric } from "@/components/landing-metric";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const query = await searchParams;
  const initialUrl =
    typeof query.url === "string" ? query.url.slice(0, 2048) : "";
  return (
    <main>
      <LandingMetric />
      <section className="container grid items-center gap-14 py-20 lg:grid-cols-[1.15fr_1fr] lg:py-28">
        <div>
          <p className="eyebrow mb-6">
            YOU BUILT THE PRODUCT. NOW FIND YOUR PEOPLE.
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-6xl">
            You built your SaaS.
            <br />
            Now find{" "}
            <span className="text-teal-700">your first customers.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed muted">
            Enter your SaaS website and get a free, personalised sales strategy
            showing who to target, where to find customers and how to start
            selling.
          </p>
          <div className="panel mt-9 shadow-sm">
            <UrlForm initialUrl={initialUrl} />
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-xs muted">
            {[
              "Built for SaaS founders",
              "Free sales strategy",
              "Grounded in your website",
            ].map((x) => (
              <span key={x} className="flex gap-1.5">
                <Check size={14} />
                {x}
              </span>
            ))}
          </div>
        </div>
        <div className="relative rounded-2xl border border-emerald-900/10 bg-[#eaf1ed] p-5 sm:p-8">
          <div className="panel shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <span className="eyebrow">YOUR GROWTH BLUEPRINT</span>
              <span className="badge">ILLUSTRATIVE PREVIEW</span>
            </div>
            <p className="mt-6 text-xs muted">01 / THE RIGHT CUSTOMERS</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Focus beats finding everyone.
            </h2>
            <p className="mt-3 text-sm leading-6 muted">
              Three prioritized customer profiles, with the pain points and
              motivations behind each.
            </p>
            <div className="my-6 space-y-3">
              {[
                "01  Your strongest starting segment",
                "02  Your next best opportunity",
                "03  A focused expansion hypothesis",
              ].map((s, i) => (
                <div
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                  key={s}
                >
                  <Target
                    size={17}
                    className={i ? "text-slate-400" : "text-teal-700"}
                  />
                  {s}
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-teal-50 p-4 text-sm leading-6 text-teal-900">
              <span className="font-semibold">From insight to action.</span>
              <br />
              Audience → message → experiment → learning.
            </div>
            <Link
              href="/preview"
              className="mt-6 flex items-center justify-between text-sm font-semibold"
            >
              Explore a sample report <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="border-y border-[var(--border)] bg-white py-16">
        <div className="container">
          <p className="eyebrow">A PLAN YOU CAN ACTUALLY USE</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Less marketing guesswork. More useful next steps.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [
                Target,
                "Know who needs you",
                "Three prioritized ICPs, their problems, buying motivations and signs worth investigating.",
              ],
              [
                MessageSquare,
                "Find the words that land",
                "Positioning recommendations and editable outreach templates grounded in what your product does.",
              ],
              [
                CalendarDays,
                "Make the next 30 days count",
                "A first-ten-customers playbook and weekly experiments with clear measures of progress.",
              ],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof Route;
              return (
                <div key={String(title)}>
                  <I size={24} className="mb-5 text-teal-700" />
                  <h3 className="font-semibold">{String(title)}</h3>
                  <p className="mt-3 text-sm leading-6 muted">{String(desc)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="container py-14">
        <p className="max-w-3xl text-sm leading-7 muted">
          Evidence where we have it. Assumptions where we don’t. Your report
          labels verified website facts, AI inferences and unknowns.
          Recommendations are experiments to test; they are never presented as
          validated demand, researched competitors or real prospects.
        </p>
      </section>
    </main>
  );
}
