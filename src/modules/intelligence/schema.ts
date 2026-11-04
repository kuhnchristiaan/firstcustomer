import { z } from "zod";
import { productProfileSchema, basisSchema } from "./product-profile";
export const claimSchema = z.object({
  text: z.string().min(1).max(2000),
  confidence: z.enum(["Verified", "Inferred", "Unknown"]),
  sources: z.array(z.string()).max(8),
});
const recommendationSchema = claimSchema.extend({
  confidence: z.enum(["Inferred", "Unknown"]),
});
export const segmentSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(200),
  customerType: z.string().max(200),
  buyerRoles: z.array(z.string().max(200)).max(10),
  problems: z.array(z.string().max(500)).max(10),
  motivations: z.array(z.string().max(500)).max(10),
  buyingSignals: z.array(z.string().max(500)).max(10),
  priority: z.number().int().min(1).max(3),
  evidence: claimSchema,
});
const strategyItem = z.object({
  title: z.string().min(1).max(200),
  recommendation: recommendationSchema,
  steps: z.array(z.string().max(600)).min(1).max(8),
  successMetric: z.string().max(300),
});
export const reportV1Schema = z.object({
  schemaVersion: z.literal("1.0"),
  businessName: z.string().min(1).max(200),
  overview: claimSchema,
  offerings: z.array(claimSchema).min(1).max(10),
  problems: z.array(claimSchema).max(10),
  valueProposition: claimSchema,
  differentiators: z.array(claimSchema).max(8),
  idealCustomers: z.array(claimSchema).length(3),
  industries: z.array(claimSchema).max(10),
  buyerPersonas: z.array(claimSchema).max(10),
  geographicFocus: claimSchema,
  segments: z.array(segmentSchema).length(3),
  buyingSignals: z.array(claimSchema).max(10),
  missingInformation: z.array(claimSchema).min(1).max(15),
  positioning: recommendationSchema,
  acquisitionChannels: z.array(strategyItem).min(3).max(5),
  outreachTemplates: z
    .array(
      z.object({
        channel: z.string().max(100),
        subject: z.string().max(200),
        body: z.string().max(2000),
        rationale: recommendationSchema,
      }),
    )
    .min(2)
    .max(4),
  firstTenPlaybook: z.array(strategyItem).min(3).max(6),
  thirtyDayPlan: z
    .array(
      z.object({
        week: z.number().int().min(1).max(4),
        objective: z.string().max(200),
        actions: z.array(z.string().max(600)).min(2).max(7),
        successMetric: z.string().max(300),
        rationale: recommendationSchema,
      }),
    )
    .length(4),
});
export const reportV11Schema = reportV1Schema.extend({
  schemaVersion: z.literal("1.1"),
  productIntelligence: productProfileSchema,
  recommendationBasis: basisSchema,
});
export const reportSchema = z.union([reportV1Schema, reportV11Schema]);
export type Report = z.infer<typeof reportSchema>;
export function validateEvidence(report: Report, urls: string[]) {
  if (report.segments.map((s) => s.priority).join(",") !== "1,2,3")
    throw new Error("Customer segments must have distinct priorities 1, 2, 3");
  if (report.thirtyDayPlan.map((s) => s.week).join(",") !== "1,2,3,4")
    throw new Error("The action plan must cover four distinct weeks");
  const canonical = (url: string) => {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return url;
    }
  };
  const allowed = new Map(urls.map((url) => [canonical(url), url]));
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("confidence" in obj) {
        const c = claimSchema.parse(obj);
        if (
          c.sources.some((s) => !allowed.has(canonical(s))) ||
          (c.confidence === "Verified" && !c.sources.length)
        )
          throw new Error("Unsupported analysis evidence");
        // Resolve only equivalent URLs back to an actual fetched source.
        obj.sources = c.sources.map((source) =>
          allowed.get(canonical(source))!,
        );
      }
      Object.values(obj).forEach(visit);
    }
  };
  visit(report);
  return report;
}
