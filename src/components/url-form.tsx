"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Turnstile } from "./turnstile";
import { track, ensureGuestSession } from "./funnel";
import Link from "next/link";
export function UrlForm({
  authenticated = false,
  initialUrl = "",
}: {
  authenticated?: boolean;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const websiteId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reportLink, setReportLink] = useState("");
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  return (
    <form
      className="url-form"
      aria-busy={pending}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setReportLink("");
        setPending(true);
        try {
          let parsedUrl: URL;
          try {
            parsedUrl = new URL(
              url.includes("://") ? url.trim() : `https://${url.trim()}`,
            );
          } catch {
            throw new Error(
              "Enter your public SaaS website, for example your-saas.com.",
            );
          }
          if (
            !["https:", "http:"].includes(parsedUrl.protocol) ||
            !parsedUrl.hostname.includes(".")
          )
            throw new Error(
              "Enter a public website address, for example your-saas.com.",
            );
          if (!authenticated) {
            const session = await ensureGuestSession();
            if (!session.ok) {
              const data = await session.json();
              throw new Error(data.error);
            }
            track("url_submission");
          }
          const r = await fetch(
            authenticated ? "/api/analyses" : "/api/guest/analyses",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, turnstileToken }),
            },
          );
          const data = await r.json();
          if (!r.ok) {
            if (!authenticated && r.status === 409)
              setReportLink(
                data.error?.includes("saved") ? "/dashboard" : "/guest/report",
              );
            throw new Error(data.error);
          }
          router.push(
            authenticated
              ? `/products/${data.productId}?draft=1`
              : "/guest/report",
          );
          router.refresh();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Report generation failed.",
          );
        } finally {
          setPending(false);
          if (!authenticated) {
            setTurnstileToken("");
            setResetKey((k) => k + 1);
          }
        }
      }}
    >
      <label htmlFor={websiteId} className="mb-2 block text-sm font-semibold">
        Your SaaS website
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Globe className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            id={websiteId}
            name="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={`${websiteId}-help ${websiteId}-error`}
            aria-invalid={Boolean(error)}
            placeholder="https://your-saas.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            maxLength={2048}
            className="website-field"
            disabled={pending}
          />
        </div>
        <Button
          disabled={pending || (!authenticated && !turnstileToken)}
          type="submit"
        >
          {pending ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <ArrowRight size={17} />
          )}{" "}
          {pending
            ? "Building your report…"
            : authenticated
              ? "Generate free report"
              : "Generate my free strategy"}
        </Button>
      </div>
      {!authenticated && (
        <Turnstile onToken={setTurnstileToken} resetKey={resetKey} />
      )}
      <p id={`${websiteId}-help`} className="mt-3 text-xs muted">
        {authenticated
          ? "Generation can take a few minutes. Keep this page open while we analyse your site."
          : "No account required. No credit card needed. Generation can take a few minutes."}
      </p>
      <p
        id={`${websiteId}-error`}
        role="alert"
        className="mt-3 text-sm text-red-700"
      >
        {error}
      </p>
      {reportLink && (
        <Link href={reportLink} className="mt-3 block text-sm underline">
          {reportLink === "/dashboard"
            ? "Open workspace"
            : "View my guest strategy"}
        </Link>
      )}
      {pending && (
        <p role="status" className="mt-4 text-sm muted">
          Checking public pages, extracting evidence and drafting your sales
          experiments…
        </p>
      )}
    </form>
  );
}
