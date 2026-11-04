import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import "./globals.css";
export const metadata: Metadata = {
  title: "FirstCustomers — Your first customers start with a plan",
  description:
    "A free, practical SaaS sales strategy generated from your website. Three ideal customer profiles, acquisition experiments and a 30-day plan.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Browser extensions can add attributes to <html> before React hydrates.
    // Suppress root attributes only; application content still gets checked.
    <html lang="en" suppressHydrationWarning>
      {/* Grammarly adds body attributes before hydration, too. */}
      <body suppressHydrationWarning>
        <header className="border-b border-[var(--border)] bg-white">
          <div className="container flex h-20 items-center justify-between gap-4">
            <Link
              href="/"
              className="brand-link flex items-center gap-2 font-bold text-xl tracking-tight"
            >
              <Compass size={26} className="text-teal-800" />
              FirstCustomers
              <span className="brand-badge badge hidden sm:block">
                FOR SAAS FOUNDERS
              </span>
            </Link>
            <SiteNavigation />
          </div>
        </header>
        {children}
        <footer className="container flex flex-wrap justify-between gap-4 py-10 text-xs text-slate-500">
          <span>
            FirstCustomers · A clearer path to your first 10 customers.
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5 text-sm">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Beta terms</Link>
            <Link href="/support">Support</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
