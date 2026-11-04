import { z } from "zod";
import { normalizeText, readDocument } from "@/modules/website/document";
const text = z.string().min(1).max(400);
export const evidenceRefSchema = z.strictObject({
  sourceUrl: z.string(),
  blockId: z.string(),
  quote: z.string().min(12).max(600),
});
export const productProfileSchema = z.strictObject({
  version: z.literal("1.0"),
  identity: z.strictObject({
    name: z.string().min(1).max(150),
    summary: text,
    category: z.enum([
      "Customer acquisition",
      "Product analytics",
      "Finance operations",
      "Developer tools",
      "Commerce",
      "People operations",
      "Security",
      "Infrastructure",
      "Other",
      "Unclear",
    ]),
    primaryJob: z.strictObject({ actor: text, problem: text, outcome: text }),
    certainty: z.enum(["Website-supported", "Uncertain"]),
    evidence: z.array(evidenceRefSchema).max(3),
  }),
  statements: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(20),
        text,
        kind: z.enum([
          "Website observation",
          "Owner product claim",
          "Inference",
          "Unknown",
        ]),
        subject: z.enum(["Owner product", "Unclear"]),
        evidence: z.array(evidenceRefSchema).max(2),
      }),
    )
    .max(8),
  limitations: z.array(text).max(4),
});
export type ProductProfile = z.infer<typeof productProfileSchema>;
const selectionRef = evidenceRefSchema.omit({ quote: true, sourceUrl: true });
export const productSelectionSchema = productProfileSchema.extend({
  identity: productProfileSchema.shape.identity.extend({
    summary: z.string().min(1).max(240),
    evidence: z.array(selectionRef).max(1),
  }),
  statements: z
    .array(
      productProfileSchema.shape.statements.element.extend({
        text: z.string().min(1).max(240),
        evidence: z.array(selectionRef).max(1),
      }),
    )
    .max(4),
});
export function hydrateProductProfile(
  input: unknown,
  sources: { url: string; content: string }[],
) {
  const selected = productSelectionSchema.parse(input);
  const blocks = sources.flatMap((s) =>
    (readDocument(s)?.blocks ?? []).map((b) => ({ ...b, url: s.url })),
  );
  const hydrate = (ref: z.infer<typeof selectionRef>) => {
    const block = blocks.find(
      (b) => b.id === ref.blockId && b.kind === "Owner candidate",
    );
    if (!block)
      throw new Error("Selected product passage is unavailable or unrelated");
    return {
      sourceUrl: block.url,
      blockId: block.id,
      quote: block.text.slice(0, 400),
    };
  };
  return validateProductProfile(
    {
      ...selected,
      identity: {
        ...selected.identity,
        evidence: selected.identity.evidence.map(hydrate),
      },
      statements: selected.statements.map((s) => ({
        ...s,
        evidence: s.evidence.map(hydrate),
      })),
    },
    sources,
  );
}
export const basisSchema = z
  .array(
    z.strictObject({
      section: z.enum([
        "segments",
        "acquisitionChannels",
        "outreachTemplates",
        "firstTenPlaybook",
        "thirtyDayPlan",
      ]),
      statementIds: z.array(z.string()).min(1).max(4),
    }),
  )
  .length(5);
export function validateProductProfile(
  input: unknown,
  sources: { url: string; content: string }[],
) {
  const profile = productProfileSchema.parse(input);
  const blocks = sources.flatMap((s) =>
    (readDocument(s)?.blocks ?? []).map((b) => ({ ...b, url: s.url })),
  );
  const canonicalUrl = (value: string) => {
    try {
      return new URL(value).href;
    } catch {
      return value;
    }
  };
  const canonicalText = (value: string) =>
    normalizeText(value)
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-");
  const validRef = (ref: z.infer<typeof evidenceRefSchema>) => {
    const matches = blocks.filter(
      (b) =>
        canonicalUrl(b.url) === canonicalUrl(ref.sourceUrl) &&
        b.kind === "Owner candidate" &&
        canonicalText(b.text).includes(canonicalText(ref.quote)),
    );
    const selected =
      matches.find((b) => b.id === ref.blockId) ??
      (matches.length === 1 ? matches[0] : undefined);
    if (!selected) {
      if (process.env.LIVE_ATTRIBUTION_TEST === "true")
        console.info({
          attributionRejection: {
            sourceFound: blocks.some(
              (b) => canonicalUrl(b.url) === canonicalUrl(ref.sourceUrl),
            ),
            blockFound: blocks.some((b) => b.id === ref.blockId),
            matchingOwnerQuotes: matches.length,
          },
        });
      return false;
    }
    ref.sourceUrl = selected.url;
    ref.blockId = selected.id;
    return true;
  };
  const refs = [
    ...profile.identity.evidence,
    ...profile.statements.flatMap((s) => s.evidence),
  ];
  if (refs.some((r) => !validRef(r)))
    throw new Error("Product evidence does not support the attributed source");
  if (
    profile.identity.certainty === "Website-supported" &&
    !profile.identity.evidence.length
  )
    throw new Error("Product identity requires quoted evidence");
  if (
    profile.identity.certainty === "Website-supported" &&
    !blocks.some(
      (b) =>
        b.kind === "Owner candidate" &&
        normalizeText(b.text)
          .toLowerCase()
          .includes(profile.identity.name.toLowerCase()),
    )
  )
    throw new Error("Product name is not established by owner content");
  if (
    new Set(profile.statements.map((s) => s.id)).size !==
    profile.statements.length
  )
    throw new Error("Product statement identities must be unique");
  for (const statement of profile.statements) {
    if (
      ["Website observation", "Owner product claim"].includes(statement.kind) &&
      (statement.subject !== "Owner product" || !statement.evidence.length)
    )
      throw new Error("Product statements require owner evidence");
    if (
      ["Inference", "Unknown"].includes(statement.kind) &&
      statement.evidence.length
    )
      throw new Error(
        "Uncertain product statements cannot claim source verification",
      );
    // Publish the publisher's actual words rather than a model paraphrase
    // attached to an otherwise genuine quotation.
    if (
      ["Website observation", "Owner product claim"].includes(statement.kind) &&
      !statement.evidence.some(
        (r) => canonicalText(r.quote) === canonicalText(statement.text),
      )
    )
      statement.text = statement.evidence[0].quote.slice(0, 400);
  }
  if (
    profile.identity.certainty === "Website-supported" &&
    !profile.identity.evidence.some(
      (r) => canonicalText(r.quote) === canonicalText(profile.identity.summary),
    )
  )
    profile.identity.summary = profile.identity.evidence[0].quote.slice(0, 400);
  return profile;
}
export function validateBasis(
  basis: z.infer<typeof basisSchema>,
  profile: ProductProfile,
) {
  if (new Set(basis.map((b) => b.section)).size !== 5)
    throw new Error("Recommendation attribution is incomplete");
  const supported = new Set(
    profile.statements
      .filter(
        (s) =>
          s.subject === "Owner product" &&
          ["Owner product claim", "Website observation"].includes(s.kind),
      )
      .map((s) => s.id),
  );
  if (basis.some((b) => b.statementIds.some((id) => !supported.has(id))))
    throw new Error("Recommendations must refer to actual product statements");
}
