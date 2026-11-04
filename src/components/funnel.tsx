"use client";
import { useEffect } from "react";
export function track(event: string) {
  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
}
let sessionRequest: Promise<Response> | undefined;
export function ensureGuestSession() {
  return (sessionRequest ??= fetch("/api/guest/session", {
    method: "POST",
  }).finally(() => {
    sessionRequest = undefined;
  }));
}
export function FunnelView({ event }: { event: string }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
