import { cookies } from "next/headers";
import { z } from "zod";
import { sameOrigin, smallJson, failure } from "@/lib/http";
import { guestConfig } from "@/modules/guest/config";
import {
  GUEST_COOKIE,
  trustedIp,
  ipFingerprint,
  verifyTurnstile,
} from "@/modules/guest/security";
import { sessionFromToken } from "@/modules/guest/service";
import { config } from "@/modules/config/env";
import { contextSchema } from "@/modules/advisor/schema";
import {
  readGuestAdvisor,
  generateGuestAdvisor,
} from "@/modules/advisor/guest-service";
export const runtime = "nodejs";
export const maxDuration = 180;
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    return Response.json(
      await readGuestAdvisor((await cookies()).get(GUEST_COOKIE)?.value),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const e = guestConfig();
    const token = (await cookies()).get(GUEST_COOKIE)?.value;
    await sessionFromToken(token);
    const body = z
      .strictObject({
        url: z.string().min(3).max(2048),
        context: contextSchema,
        turnstileToken: z.string().min(1).max(2048),
      })
      .parse(await smallJson(request));
    const ip = trustedIp(request, e);
    await verifyTurnstile(
      body.turnstileToken,
      e.TURNSTILE_SECRET_KEY,
      config().APP_URL,
    );
    return Response.json(
      await generateGuestAdvisor(
        token,
        body.url,
        body.context,
        ipFingerprint(ip, e.GUEST_IP_HASH_SECRET),
      ),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
