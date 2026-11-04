"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export function ClaimGuest() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/guest/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        router.replace(`/products/${data.productId}?run=${data.analysisId}`);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Your strategy could not be saved.",
        );
      }
    })();
  }, [router]);
  return (
    <div className="panel mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">
        {error ? "Your account is ready." : "Saving your strategy…"}
      </h1>
      <p role="status" className="my-5 text-sm leading-7 muted">
        {error ||
          "We are moving the report you already generated into your private workspace. No new AI analysis will run."}
      </p>
      {error && (
        <div className="flex gap-5 text-sm underline">
          <Link href="/guest/report">Return to guest report</Link>
          <Link href="/dashboard">Open workspace</Link>
        </div>
      )}
    </div>
  );
}
