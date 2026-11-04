"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressiveReport } from "./progressive-report";
import { reportSchema, type Report } from "@/modules/intelligence/schema";
import { UrlForm } from "./url-form";
import { Button } from "./ui/button";
import { track } from "./funnel";
export function GuestReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState("LOADING");
  const [error, setError] = useState("");
  const [expires, setExpires] = useState("");
  const [mock, setMock] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    let counted = false;
    const read = async () => {
      try {
        const response = await fetch("/api/guest/report", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!live) return;
        if (!response.ok) {
          setStatus("UNAVAILABLE");
          setError(data.error);
          return;
        }
        setStatus(data.status);
        setWebsiteUrl(data.websiteUrl ?? "");
        setExpires(data.expiresAt);
        setMock(data.mock);
        if (data.output) {
          setReport(reportSchema.parse(data.output));
          if (!counted) {
            track("report_view");
            counted = true;
          }
        }
        if (data.error) setError(data.error);
        if (data.status === "RUNNING") timer = setTimeout(read, 4000);
      } catch {
        if (live) {
          setStatus("FAILED");
          setError(
            "We could not load your strategy. Please refresh and try again.",
          );
        }
      }
    };
    void read();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);
  return (
    <main className="container py-10">
      {report ? (
        <>
          <section className="panel no-print mb-8 border-teal-200 bg-teal-50">
            <p className="eyebrow">YOUR SALES STRATEGY IS READY</p>
            <h1 className="mt-3 text-2xl font-semibold">
              A plan to start finding your first customers.
            </h1>
            <p className="my-4 max-w-3xl text-sm leading-7">
              Your sales strategy is ready. Create a free account to save it,
              keep every version of your strategy as you work towards your first
              10 customers.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Button asChild>
                <Link
                  href="/guest/claim"
                  onClick={() => track("save_strategy_click")}
                >
                  Save My Strategy — Free
                </Link>
              </Button>
              <a href="#complete-report" className="text-sm underline">
                Continue Reading Without an Account
              </a>
            </div>
            <p className="mt-4 text-xs muted">
              Your private guest report expires{" "}
              {new Date(expires).toLocaleString()}. Save it to revisit, edit
              customer profiles and refine your acquisition plan.
            </p>
          </section>
          <div id="complete-report">
            <ProgressiveReport initial={report} mock={mock} />
          </div>
          <div className="panel no-print mt-8">
            <h2 className="text-xl font-semibold">
              Keep your next steps in reach.
            </h2>
            <p className="my-4 text-sm muted">
              Save this exact strategy permanently, edit and refine it, and
              return to your acquisition plan later. Keep your notes and
              progress in the editable action plan.
            </p>
            <Button asChild>
              <Link
                href="/guest/claim"
                onClick={() => track("save_strategy_click")}
              >
                Save My Strategy — Free
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <section className="panel mx-auto max-w-2xl">
          <p className="eyebrow">YOUR FREE SALES STRATEGY</p>
          <h1 className="my-5 text-3xl font-semibold">
            {status === "RUNNING"
              ? "Your strategy is being built…"
              : status === "LOADING"
                ? "Loading your strategy…"
                : "Your guest strategy"}
          </h1>
          <p role="status" className="mb-6 text-sm leading-7 muted">
            {status === "RUNNING"
              ? "We are checking your public website, collecting evidence and writing your sales plan. This page will update automatically."
              : error ||
                "Enter your SaaS website to get started. No account is required."}
          </p>
          {!["RUNNING", "LOADING"].includes(status) && (
            <UrlForm initialUrl={websiteUrl} />
          )}
        </section>
      )}
    </main>
  );
}
