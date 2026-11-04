import { z } from "zod";
import { tenant, ownedProduct } from "@/modules/auth/tenant";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { failure, sameOrigin, smallJson } from "@/lib/http";
import {
  readRevisions,
  generateRevision,
  approveRevision,
} from "@/modules/strategy/service";
export const runtime = "nodejs";
export const maxDuration = 150;
type C = { params: Promise<{ id: string }> };
async function access(request: Request, c: C) {
  const t = await tenant(),
    { id } = await c.params;
  await ownedProduct(t.organizationId, id);
  const analysisId = z
    .string()
    .min(1)
    .max(100)
    .parse(new URL(request.url).searchParams.get("analysisId"));
  const run = await db().analysisRun.findFirst({
    where: {
      id: analysisId,
      productId: id,
      product: { organizationId: t.organizationId },
    },
  });
  if (!run) throw new AppError("Report unavailable", 404);
  return { tenant: t, analysisId };
}
export async function GET(r: Request, c: C) {
  try {
    return Response.json(await readRevisions(await access(r, c)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request, c: C) {
  try {
    sameOrigin(r);
    const a = await access(r, c);
    const body = z
      .strictObject({ context: z.unknown() })
      .parse(await smallJson(r));
    return Response.json(
      { id: await generateRevision(a, body.context) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(r: Request, c: C) {
  try {
    sameOrigin(r);
    const a = await access(r, c);
    const { revisionId, strategy } = z
      .strictObject({
        revisionId: z.string().min(1).max(100),
        strategy: z.unknown().optional(),
      })
      .parse(await smallJson(r));
    const id = await approveRevision(a, revisionId, strategy);
    return Response.json(
      { saved: true, id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
