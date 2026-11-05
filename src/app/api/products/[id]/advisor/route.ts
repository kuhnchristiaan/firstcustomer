import { z } from "zod";
import { tenant } from "@/modules/auth/tenant";
import { failure, sameOrigin, smallJson } from "@/lib/http";
import {
  advisorWorkspace,
  advisorView,
  saveContext,
  generateStrategy,
  completeTask,
  assist,
} from "@/modules/advisor/service";
import { assistInputSchema, contextSchema } from "@/modules/advisor/schema";
export const runtime = "nodejs";
export const maxDuration = 180;
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    return Response.json(
      advisorView(
        await advisorWorkspace(await tenant(), (await context.params).id),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const t = await tenant();
    const body = z
      .strictObject({
        context: contextSchema,
        expectedVersion: z.number().int().nonnegative(),
      })
      .parse(await smallJson(request));
    return Response.json(
      advisorView(
        await saveContext(
          t,
          (await context.params).id,
          body.context,
          body.expectedVersion,
        ),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
const mutation = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("generate"),
    expectedVersion: z.number().int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal("task"),
    taskId: z.string(),
    completed: z.boolean(),
    expectedVersion: z.number().int().nonnegative(),
  }),
  z.strictObject({ kind: z.literal("assist"), input: assistInputSchema }),
]);
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const t = await tenant();
    const { id } = await context.params;
    const body = mutation.parse(await smallJson(request));
    if (body.kind === "generate")
      return Response.json(
        advisorView(await generateStrategy(t, id, body.expectedVersion)),
      );
    if (body.kind === "task")
      return Response.json(
        await completeTask(
          t,
          id,
          body.taskId,
          body.completed,
          body.expectedVersion,
        ),
      );
    return Response.json(await assist(t, id, body.input));
  } catch (error) {
    return failure(error);
  }
}
