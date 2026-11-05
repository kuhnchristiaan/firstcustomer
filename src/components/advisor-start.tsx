"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
export function AdvisorStart({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="panel advisor-start"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
          const response = await fetch("/api/advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          router.push(`/products/${data.productId}/advisor`);
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not start your advisor.",
          );
          setPending(false);
        }
      }}
    >
      <label htmlFor="advisor-url" className="font-semibold">
        Your SaaS website
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="advisor-url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-saas.com"
          autoComplete="url"
          className="min-w-0 flex-1"
        />
        <Button disabled={pending}>
          {pending ? "Opening…" : "Start my advisor"}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-3 text-sm muted">
        One buyer. One channel. A practical plan for the next seven days.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
