"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
export function Turnstile({
  onToken,
  resetKey,
}: {
  onToken: (value: string) => void;
  resetKey: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) =>
      setCompact(entries[0].contentRect.width < 300),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const [status, setStatus] = useState("Loading verification…");
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!ready || !ref.current || !window.turnstile) return;
    callback.current("");
    const id = window.turnstile.render(ref.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      action: "guest_analysis",
      size: compact ? "compact" : "flexible",
      "before-interactive-callback": () =>
        setStatus("Complete verification to generate your strategy."),
      callback: (token: string) => {
        callback.current(token);
        setStatus("Verification complete. You can generate your strategy.");
      },
      "expired-callback": () => {
        callback.current("");
        setStatus("Verification expired. Complete the check again.");
      },
      "error-callback": () => {
        callback.current("");
        setStatus("Verification failed. Retry the check or refresh this page.");
      },
    });
    return () => {
      window.turnstile?.remove(id);
    };
  }, [ready, resetKey, compact, retry]);
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
    return (
      <p className="text-xs muted">
        Free reports are temporarily unavailable. Please try again later.
      </p>
    );
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => {
          setReady(true);
          setStatus("Complete verification to generate your strategy.");
        }}
        onError={() =>
          setStatus(
            "Verification could not load. Check your connection and refresh this page.",
          )
        }
      />
      <div ref={ref} className="verification-slot" />
      {ready && (status.includes("expired") || status.includes("failed")) && (
        <button
          type="button"
          className="my-2 text-sm underline"
          onClick={() => {
            setRetry((n) => n + 1);
            setStatus("Complete verification to generate your strategy.");
          }}
        >
          Retry verification
        </button>
      )}
      <p role="status" aria-live="polite" className="my-3 text-sm muted">
        {status}
      </p>
    </>
  );
}
