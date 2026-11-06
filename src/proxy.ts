import { auth } from "@/modules/auth/server";

// Refresh Neon sessions and handle auth callback state before protected pages.
// Domain services still perform session and tenant authorization independently.
export default auth().middleware({ loginUrl: "/auth/sign-in" });
export const config = {
  matcher: ["/dashboard/:path*", "/products/:path*"],
};
