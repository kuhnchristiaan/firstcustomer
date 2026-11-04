import { cookies } from "next/headers";
import { z } from "zod";
import { failure, sameOrigin, smallJson } from "@/lib/http";
import { config } from "@/modules/config/env";
import { guestConfig } from "@/modules/guest/config";
import {
  GUEST_COOKIE,
  trustedIp,
  ipFingerprint,
  verifyTurnstile,
} from "@/modules/guest/security";
import { readRevisions, generateRevision } from "@/modules/strategy/service";
export const runtime = "nodejs";
export const maxDuration = 150;
export async function GET() {
  try {
    return Response.json(
      await readRevisions({
        token: (await cookies()).get(GUEST_COOKIE)?.value,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const e = guestConfig();
    const body = z
      .strictObject({
        context: z.unknown(),
        turnstileToken: z.string().min(1).max(2048),
      })
      .parse(await smallJson(request));
    const ip = trustedIp(request, e);
    await verifyTurnstile(
      body.turnstileToken,
      e.TURNSTILE_SECRET_KEY,
      config().APP_URL,
    );
    const id = await generateRevision(
      {
        token: (await cookies()).get(GUEST_COOKIE)?.value,
        ipHash: ipFingerprint(ip, e.GUEST_IP_HASH_SECRET),
      },
      body.context,
    );
    return Response.json({ id }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
