"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdvisorClient } from "./advisor-client";
import { ensureGuestSession } from "./funnel";
import { emptyContext } from "@/modules/advisor/schema";
import type { advisorView } from "@/modules/advisor/service";
type Data = ReturnType<typeof advisorView>;
export function GuestAdvisor({ url }: { url: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [running, setRunning] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    async function read() {
      try {
        const session = await ensureGuestSession();
        if (!session.ok) throw new Error((await session.json()).error);
        const response = await fetch("/api/guest/advisor", {
          cache: "no-store",
        });
        const result = await response.json();
        if (!live) return;
        if (!response.ok) throw new Error(result.error);
        if (result.status === "CLAIMED") {
          router.replace("/advisor");
          return;
        }
        if (result.status === "LEGACY") {
          router.replace("/guest/report");
          return;
        }
        const next = result.data;
        if (!next.websiteUrl) next.websiteUrl = url;
        setData(next);
        setExpiresAt(result.expiresAt);
        setRunning(result.status === "RUNNING");
        setError(result.error ?? "");
        if (result.status === "RUNNING") timer = setTimeout(read, 4000);
      } catch (e) {
        if (live)
          setError(
            e instanceof Error ? e.message : "Could not load your advisor.",
          );
      }
    }
    void read();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [url, router]);
  if (!data)
    return (
      <div className="panel" role="status">
        {error || "Opening your private guest advisor…"}
      </div>
    );
  if (!data.websiteUrl)
    return (
      <div className="panel">
        <Link href="/advisor">Enter your SaaS website to begin →</Link>
      </div>
    );
  return (
    <>
      {error && (
        <p role="alert" className="advisor-error">
          {error}
        </p>
      )}
      {running ? (
        <p role="status">
          Your plan is being prepared. You can leave this page open.
        </p>
      ) : (
        <AdvisorClient
          key={data.strategy?.id ?? "new"}
          initial={{ ...data, context: data.context ?? emptyContext }}
          guest
        />
      )}
      {expiresAt && (
        <p className="text-sm muted mt-6">
          This private guest plan stays available in this browser until{" "}
          {new Date(expiresAt).toLocaleString()}. Create a free account to keep
          it.
        </p>
      )}
    </>
  );
}
