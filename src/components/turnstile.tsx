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
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!ready || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      action: "guest_analysis",
      callback: (token: string) => callback.current(token),
      "expired-callback": () => callback.current(""),
      "error-callback": () => callback.current(""),
    });
    return () => {
      window.turnstile?.remove(id);
    };
  }, [ready, resetKey]);
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
        onReady={() => setReady(true)}
      />
      <div ref={ref} className="mt-4 min-h-16" />
    </>
  );
}
