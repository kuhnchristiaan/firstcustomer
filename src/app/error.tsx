"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container py-20">
      <h1 className="text-3xl font-semibold">We couldn’t load this page.</h1>
      <p className="my-5 muted">
        Please retry. If this continues, check the application’s service
        configuration.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
