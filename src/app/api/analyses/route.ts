import { z } from "zod";
import { tenant } from "@/modules/auth/tenant";
import { generate } from "@/modules/analysis/service";
import { failure, sameOrigin, smallJson } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 150;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const t = await tenant();
    const { url } = z
      .object({ url: z.string().min(3).max(2048) })
      .parse(await smallJson(request));
    return Response.json({ productId: await generate(t, url) });
  } catch (e) {
    return failure(e);
  }
}
