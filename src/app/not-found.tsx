import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container">
      <div className="error-state">
        <p className="section-kicker">404 · A small detour.</p>
        <h1 className="font-semibold">We couldn’t find that page.</h1>
        <p className="my-5 muted">
          The link may have changed. Your next move is still within reach.
        </p>
        <Link href="/dashboard" className="mt-5 block underline">
          Return to workspace
        </Link>
        <Link href="/" className="text-link mt-5">
          Back to FirstCustomers →
        </Link>
      </div>
    </main>
  );
}
