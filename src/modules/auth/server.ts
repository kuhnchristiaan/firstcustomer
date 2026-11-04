import { createNeonAuth } from "@neondatabase/auth/next/server";
import { config } from "@/modules/config/env";
export function auth() {
  const e = config();
  return createNeonAuth({
    baseUrl: e.NEON_AUTH_BASE_URL,
    cookies: { secret: e.NEON_AUTH_COOKIE_SECRET },
  });
}
