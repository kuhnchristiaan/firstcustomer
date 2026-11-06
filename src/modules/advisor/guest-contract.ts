import { z } from "zod";
import {
  productProfileSchema,
  validateProductProfile,
} from "@/modules/intelligence/product-profile";
import { advisorSchema, checkResources, contextSchema } from "./schema";

const envelope = z.object({
  kind: z.literal("guest-advisor/1"),
  context: contextSchema,
  profile: productProfileSchema,
  sources: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      content: z.string(),
      contentHash: z.string(),
      status: z.string(),
    }),
  ),
  strategy: z.unknown(),
  fixture: z.boolean(),
  usage: z
    .array(
      z.object({
        model: z.string(),
        inputTokens: z.number().nonnegative(),
        outputTokens: z.number().nonnegative(),
        reasoningTokens: z.number().nonnegative(),
        estimatedCost: z.number().nonnegative(),
      }),
    )
    .max(2),
});
/** Distinct from legacy reports; never render this as a long report. */
export function parseGuestAdvisor(raw: unknown) {
  const value = envelope.parse(raw);
  const profile = validateProductProfile(value.profile, value.sources);
  const ids = profile.statements.map((s) => s.id) as [string, ...string[]];
  if (!ids.length) throw new Error("Product evidence is missing");
  const strategy = advisorSchema(ids).parse(value.strategy);
  checkResources(strategy, value.context);
  return { ...value, profile, strategy };
}
