import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { Brand } from "@/components/brand";
import { PrintSupport } from "@/components/print-support";
import { SiteNavigation } from "@/components/site-navigation";
import "./globals.css";
import "./print.css";
const displayFont = localFont({
  src: "./fonts/InstrumentSans.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "400 700",
});
const interfaceFont = localFont({
  src: "./fonts/Inter.woff2",
  variable: "--font-interface",
  display: "swap",
  weight: "400 700",
});
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
    <html
      lang="en"
      className={`${displayFont.variable} ${interfaceFont.variable}`}
      suppressHydrationWarning
    >
      {/* Grammarly adds body attributes before hydration, too. */}
      <body suppressHydrationWarning>
        <PrintSupport />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <header className="site-header no-print">
          <div className="container header-inner">
            <Link href="/" className="brand-link">
              <Brand />
            </Link>
            <SiteNavigation />
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer className="container site-footer no-print">
          <span>Built for the leap from product to paying customers.</span>
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
