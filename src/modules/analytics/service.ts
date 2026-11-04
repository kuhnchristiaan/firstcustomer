import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
export const clientEvents = [
  "landing_visit",
  "url_submission",
  "report_view",
  "save_strategy_click",
  "registration_start",
] as const;
export const serverEvents = [
  "guest_analysis_start",
  "report_generated",
  "analysis_failed",
  "registration_completed",
  "report_claimed",
] as const;
export type FunnelEvent =
  (typeof clientEvents)[number] | (typeof serverEvents)[number];
export async function metric(
  event: FunnelEvent,
  client: Prisma.TransactionClient | ReturnType<typeof db> = db(),
) {
  const day = new Date(new Date().toISOString().slice(0, 10));
  await client.$executeRaw`INSERT INTO "FunnelMetric" ("day","event","count") VALUES (${day},${event},1) ON CONFLICT ("day","event") DO UPDATE SET "count"="FunnelMetric"."count"+1`;
}
