import { createHash, createHmac, randomBytes } from "node:crypto";
import ipaddr from "ipaddr.js";
import { AppError } from "@/lib/errors";
import type { guestConfig } from "./config";
import { isTestTurnstile } from "./config";
export const GUEST_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-fc_guest" : "fc_guest";
export function newGuestToken() {
  return randomBytes(32).toString("base64url");
}
export function tokenHash(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError("This guest report is unavailable or has expired.", 404);
  return createHash("sha256").update(token).digest("hex");
}
export function trustedIp(request: Request, e: ReturnType<typeof guestConfig>) {
  if (e.GUEST_IP_MODE === "local") {
    if (process.env.NODE_ENV === "production")
      throw new AppError("Guest request metadata is unavailable.", 503);
    return "127.0.0.1";
  }
  if (process.env.VERCEL !== "1")
    throw new AppError("Guest request metadata is unavailable.", 503);
  const value = request.headers.get("x-vercel-forwarded-for");
  if (!value || value.includes(",") || !ipaddr.isValid(value))
    throw new AppError("Guest request metadata is unavailable.", 503);
  return ipaddr.process(value).toNormalizedString();
}
export function ipFingerprint(ip: string, secret: string, now = new Date()) {
  return createHmac("sha256", secret)
    .update(`${now.toISOString().slice(0, 10)}:${ip}`)
    .digest("hex");
}
export async function verifyTurnstile(
  token: string,
  secret: string,
  appUrl: string,
) {
  if (isTestTurnstile(secret) && process.env.NODE_ENV === "production")
    throw new AppError("Public guest protection is not configured.", 503);
  if (!token || token.length > 2048)
    throw new AppError("Please complete the security check.", 400);
  let body: Record<string, unknown>;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("Unavailable");
    body = await response.json();
  } catch {
    throw new AppError(
      "The security check is unavailable. Please try again.",
      503,
    );
  }
  const localTest =
    isTestTurnstile(secret) && process.env.NODE_ENV !== "production";
  if (
    body.success !== true ||
    (!localTest &&
      (body.action !== "guest_analysis" ||
        body.hostname !== new URL(appUrl).hostname))
  )
    throw new AppError("Security check failed. Please try again.", 400);
}
