import { cookies } from "next/headers";
import { readGuest } from "@/modules/guest/service";
import { GUEST_COOKIE } from "@/modules/guest/security";
import { failure } from "@/lib/http";
export async function GET() {
  try {
    return Response.json(
      await readGuest((await cookies()).get(GUEST_COOKIE)?.value),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
