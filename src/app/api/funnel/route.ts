import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { sameOrigin, smallJson, failure } from "@/lib/http";
import { clientEvents, metric } from "@/modules/analytics/service";
import { createHash } from "node:crypto";
import { sessionFromToken } from "@/modules/guest/service";
import { GUEST_COOKIE } from "@/modules/guest/security";
// Only aggregate counters are stored; no URLs, email addresses, report IDs or contents.
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { event } = z
      .object({ event: z.enum(clientEvents) })
      .parse(await smallJson(request));
    const jar = await cookies();
    const token = jar.get(GUEST_COOKIE)?.value;
    if (!token) return new Response(null, { status: 204 });
    await sessionFromToken(token);
    const digest = createHash("sha256").update(token).digest("hex");
    await db().$transaction(async (tx) => {
      const key = `metric:${event}:${digest}`;
      const expiry = new Date(Date.now() + 48 * 3600000);
      await tx.$executeRaw`INSERT INTO "UsageBucket" ("key","count","expiresAt") VALUES (${key},0,${expiry}) ON CONFLICT ("key") DO NOTHING`;
      const updated = await tx.usageBucket.updateMany({
        where: { key, count: 0 },
        data: { count: 1 },
      });
      if (updated.count) await metric(event, tx);
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
