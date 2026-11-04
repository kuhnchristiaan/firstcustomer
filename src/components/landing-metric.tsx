"use client";
import { useEffect, useRef } from "react";
import { ensureGuestSession, track } from "./funnel";
export function LandingMetric() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void ensureGuestSession()
      .then((response) => {
        if (response.ok) track("landing_visit");
      })
      .catch(() => {});
  }, []);
  return null;
}
