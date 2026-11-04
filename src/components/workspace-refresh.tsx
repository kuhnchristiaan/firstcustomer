"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Refresh server state only; never starts or retries paid analysis.
export function WorkspaceRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 1000)
        return;
      last = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = active ? setInterval(refresh, 5000) : undefined;
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [active, router]);
  return null;
}
