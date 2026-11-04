import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container py-20">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <Link href="/dashboard" className="mt-5 block underline">
        Return to workspace
      </Link>
    </main>
  );
}
