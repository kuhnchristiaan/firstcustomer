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
    <nav className="flex items-center gap-4 text-sm">
      <Link href={signedIn ? "/dashboard" : "/preview"}>
        {signedIn ? "Workspace" : "View sample report"}
      </Link>
      <Link href={signedIn ? "/dashboard" : "/auth/sign-in"}>
        {signedIn ? "My reports" : "Sign in"}
      </Link>
    </nav>
  );
}
