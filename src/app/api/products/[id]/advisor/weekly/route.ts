import { z } from "zod";
import { tenant } from "@/modules/auth/tenant";
import { failure, sameOrigin, smallJson } from "@/lib/http";
import { weeklyResultsSchema } from "@/modules/advisor/weekly-schema";
import {
  weeklyHistory,
  submitResults,
  generateWeeklyReview,
  acceptWeeklyPlan,
} from "@/modules/advisor/weekly-service";
export const runtime = "nodejs";
export const maxDuration = 150;
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    return Response.json(
      await weeklyHistory(await tenant(), (await context.params).id),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
const mutation = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("results"), results: weeklyResultsSchema }),
  z.strictObject({ kind: z.literal("review"), reviewId: z.string().min(1) }),
  z.strictObject({
    kind: z.literal("accept"),
    reviewId: z.string().min(1),
    expectedPlanId: z.string().min(1),
    confirmMaterialChange: z.boolean(),
  }),
]);
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const t = await tenant();
    const { id } = await context.params;
    const body = mutation.parse(await smallJson(request));
    if (body.kind === "results")
      return Response.json(await submitResults(t, id, body.results));
    if (body.kind === "review")
      return Response.json(await generateWeeklyReview(t, id, body.reviewId));
    return Response.json(await acceptWeeklyPlan(t, id, body));
  } catch (error) {
    return failure(error);
  }
}
