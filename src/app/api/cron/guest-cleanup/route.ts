import { timingSafeEqual } from "node:crypto";
import { cleanupGuests } from "@/modules/guest/cleanup";
import { failure } from "@/lib/http";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") || "";
  const target = `Bearer ${expected}`;
  if (
    !expected ||
    expected.length < 32 ||
    Buffer.byteLength(provided) !== Buffer.byteLength(target) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(target))
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ deleted: await cleanupGuests() });
  } catch (error) {
    return failure(error);
  }
}
