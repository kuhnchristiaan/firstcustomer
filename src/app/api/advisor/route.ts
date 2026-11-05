import { z } from "zod";
import { tenant } from "@/modules/auth/tenant";
import { failure, sameOrigin, smallJson } from "@/lib/http";
import { startAdvisor } from "@/modules/advisor/service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const t = await tenant();
    const { url } = z
      .strictObject({ url: z.string().min(3).max(2048) })
      .parse(await smallJson(request));
    return Response.json({ productId: await startAdvisor(t, url) });
  } catch (error) {
    return failure(error);
  }
}
