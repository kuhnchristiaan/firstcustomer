import { cookies } from "next/headers";
import { tenant } from "@/modules/auth/tenant";
import { claimGuest } from "@/modules/guest/service";
import { GUEST_COOKIE } from "@/modules/guest/security";
import { failure, sameOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const t = await tenant();
    const result = await claimGuest(
      (await cookies()).get(GUEST_COOKIE)?.value,
      t,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
