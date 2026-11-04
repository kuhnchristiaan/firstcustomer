import { auth } from "@/modules/auth/server";
import { metric } from "@/modules/analytics/service";
export async function GET(
  r: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return auth().handler().GET(r, context);
}
export async function POST(
  r: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const response = await auth().handler().POST(r, context);
  if (
    response.ok &&
    (await context.params).path.join("/") === "sign-up/email"
  ) {
    try {
      await metric("registration_completed");
    } catch {
      console.error(JSON.stringify({ event: "funnel_metric_failed" }));
    }
  }
  return response;
}
export async function PUT(
  r: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return auth().handler().PUT(r, context);
}
export async function DELETE(
  r: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return auth().handler().DELETE(r, context);
}
export async function PATCH(
  r: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return auth().handler().PATCH(r, context);
}
