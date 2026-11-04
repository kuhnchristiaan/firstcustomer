import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createGuestSession } from "@/modules/guest/service";
import {
  GUEST_COOKIE,
  trustedIp,
  ipFingerprint,
} from "@/modules/guest/security";
import { guestConfig } from "@/modules/guest/config";
import { sameOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const e = guestConfig();
    const ip = trustedIp(request, e);
    const jar = await cookies();
    const { session, token } = await createGuestSession(
      jar.get(GUEST_COOKIE)?.value,
      ipFingerprint(ip, e.GUEST_IP_HASH_SECRET),
    );
    const response = NextResponse.json(
      { expiresAt: session.expiresAt },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(GUEST_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
