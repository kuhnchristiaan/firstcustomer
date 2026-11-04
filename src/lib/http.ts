import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { config } from "@/modules/config/env";
import { ZodError } from "zod";
export function sameOrigin(request: Request) {
  const e = config();
  const origin = request.headers.get("origin");
  const allowed = [new URL(e.APP_URL).origin];
  if (process.env.NODE_ENV !== "production" && e.DEV_LAN_ORIGIN)
    allowed.push(new URL(e.DEV_LAN_ORIGIN).origin);
  if (!origin || !allowed.includes(origin))
    throw new AppError("Invalid request origin.", 403);
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "Please check the submitted information." },
      { status: 400 },
    );
  console.error(
    JSON.stringify({
      event: "request_failed",
      type: error instanceof Error ? error.name : "Unknown",
      code:
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : undefined,
    }),
  );
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}
export async function smallJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 100000) {
      await reader.cancel();
      throw new AppError("Request too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("Invalid JSON request.");
  }
}
