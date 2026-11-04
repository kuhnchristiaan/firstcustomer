import { cookies } from "next/headers";
import { z } from "zod";
import { failure, sameOrigin, smallJson } from "@/lib/http";
import { config } from "@/modules/config/env";
import { guestConfig } from "@/modules/guest/config";
import {
  GUEST_COOKIE,
  tokenHash,
  trustedIp,
  ipFingerprint,
  verifyTurnstile,
} from "@/modules/guest/security";
import { generateGuest, sessionFromToken } from "@/modules/guest/service";
export const runtime = "nodejs";
export const maxDuration = 150;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const e = guestConfig();
    const token = (await cookies()).get(GUEST_COOKIE)?.value;
    tokenHash(token);
    await sessionFromToken(token);
    const { url, turnstileToken } = z
      .object({
        url: z.string().min(3).max(2048),
        turnstileToken: z.string().min(1).max(2048),
      })
      .parse(await smallJson(request));
    const ip = trustedIp(request, e);
    await verifyTurnstile(
      turnstileToken,
      e.TURNSTILE_SECRET_KEY,
      config().APP_URL,
    );
    await generateGuest(token, url, ipFingerprint(ip, e.GUEST_IP_HASH_SECRET));
    return Response.json(
      { ready: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
