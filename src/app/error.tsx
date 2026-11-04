"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container">
      <div className="error-state">
        <p className="section-kicker">Let’s get you back on track.</p>
        <h1 className="text-3xl font-semibold">We couldn’t load this page.</h1>
        <p className="my-5 muted">
          Your saved work is still yours. Try loading this page again, or
          contact support if the problem continues.
        </p>
        <Button onClick={reset}>Try again</Button>
        <Link href="/support" className="text-link ml-5">
          Get help
        </Link>
      </div>
    </main>
  );
}
