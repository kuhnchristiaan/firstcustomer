"use client";
import { useEffect, useRef, useState } from "react";
import { loadTurnstileSdk } from "@/lib/turnstile-sdk";
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
  const ref = useRef<HTMLDivElement>(null),
    callback = useRef(onToken);
  const [compact, setCompact] = useState(false),
    [retry, setRetry] = useState(0),
    [status, setStatus] = useState("Loading verification…"),
    [canRetry, setCanRetry] = useState(false);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) =>
      setCompact(entries[0].contentRect.width < 300),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return;
    let live = true,
      id: string | undefined,
      watchdog: ReturnType<typeof setTimeout> | undefined;
    const fail = (message: string) => {
      if (!live) return;
      callback.current("");
      setStatus(message);
      setCanRetry(true);
      clearTimeout(watchdog);
    };
    callback.current("");
    const offline = () =>
      fail("You appear to be offline. Reconnect, then retry verification.");
    const online = () => {
      if (live)
        setStatus((s) =>
          s.includes("offline")
            ? "Connection restored. Retry verification to continue."
            : s,
        );
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    loadTurnstileSdk()
      .then(() => {
        if (!live || !ref.current || !window.turnstile) return;
        setCanRetry(false);
        setStatus("Complete verification to generate your strategy.");
        watchdog = setTimeout(
          () =>
            fail(
              "Verification is taking longer than expected. Complete any visible challenge, or retry the check.",
            ),
          45000,
        );
        id = window.turnstile.render(ref.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          action: "guest_analysis",
          size: compact ? "compact" : "flexible",
          "before-interactive-callback": () => {
            if (live)
              setStatus("Complete the security check below to continue.");
          },
          callback: (token: string) => {
            if (!live) return;
            clearTimeout(watchdog);
            callback.current(token);
            setCanRetry(false);
            setStatus("Verification complete. You can generate your strategy.");
          },
          "expired-callback": () =>
            fail("Verification expired. Retry the check to continue."),
          "timeout-callback": () =>
            fail("Verification timed out. Retry the check to continue."),
          "error-callback": () => {
            fail(
              "Verification failed. Check your connection and retry the check.",
            );
            return true;
          },
        });
      })
      .catch(() =>
        fail("Verification could not load. Check your connection and retry."),
      );
    return () => {
      live = false;
      clearTimeout(watchdog);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      if (id) window.turnstile?.remove(id);
    };
  }, [resetKey, compact, retry]);
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
    return (
      <p className="text-xs muted">
        Free reports are temporarily unavailable. Please try again later.
      </p>
    );
  return (
    <>
      <div
        ref={ref}
        className={`verification-slot${compact ? " verification-compact" : ""}`}
      />
      {canRetry && (
        <button
          type="button"
          className="my-2 text-sm underline retry-verification"
          onClick={() => {
            callback.current("");
            setCanRetry(false);
            setStatus("Loading verification…");
            setRetry((n) => n + 1);
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
