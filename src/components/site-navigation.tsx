import Link from "next/link";
import { auth } from "@/modules/auth/server";
import { configured } from "@/modules/config/env";
import { cookies } from "next/headers";
export async function SiteNavigation() {
  // Mark session-aware navigation dynamic before the SDK's error logger sees
  // Next's static-render bailout. Keep this outside the recovery catch.
  await cookies();
  let signedIn = false;
  if (configured())
    try {
      signedIn = Boolean((await auth().getSession()).data?.user);
    } catch {}
  return (
    <nav aria-label="Main navigation" className="site-nav">
      <Link href={"/advisor"}>{signedIn ? "Advisor" : "Free advisor"}</Link>
      <Link href={signedIn ? "/dashboard" : "/auth/sign-in"}>
        {signedIn ? "My reports" : "Sign in"}
        <span aria-hidden="true"> ↗</span>
      </Link>
    </nav>
  );
}
