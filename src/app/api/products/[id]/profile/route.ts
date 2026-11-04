import { z } from "zod";
import { tenant } from "@/modules/auth/tenant";
import { approve } from "@/modules/analysis/service";
import { failure, sameOrigin, smallJson } from "@/lib/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(r);
    const t = await tenant();
    const { id } = await params;
    const body = z
      .object({
        analysisId: z.string(),
        report: z.unknown(),
        expectedVersion: z.number().int().nonnegative(),
      })
      .parse(await smallJson(r));
    const profile = await approve(
      t,
      id,
      body.analysisId,
      body.report,
      body.expectedVersion,
    );
    return Response.json({ version: profile.version });
  } catch (e) {
    return failure(e);
  }
}
