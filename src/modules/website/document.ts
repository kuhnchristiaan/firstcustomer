import { z } from "zod";

export const blockSchema = z.object({
  id: z.string(),
  text: z.string(),
  context: z.string(),
  kind: z.enum([
    "Owner candidate",
    "Illustrative",
    "Third party",
    "Editorial",
    "Ambiguous",
  ]),
});
export const documentSchema = z.object({
  extractionVersion: z.literal("2.0"),
  url: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
});
export type EvidenceDocument = z.infer<typeof documentSchema>;
export type EvidenceBlock = z.infer<typeof blockSchema>;
export const normalizeText = (s: string) => s.replace(/\s+/g, " ").trim();
export function readDocument(source: {
  url: string;
  content: string;
}): EvidenceDocument | null {
  try {
    const parsed = documentSchema.safeParse(JSON.parse(source.content));
    return parsed.success && parsed.data.url === source.url
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}
export function limitDocument(document: EvidenceDocument, budget: number) {
  const next: EvidenceDocument = { ...document, blocks: [] };
  for (const block of [...document.blocks].sort(
    (a, b) =>
      Number(b.kind === "Owner candidate") -
      Number(a.kind === "Owner candidate"),
  )) {
    const copy = {
      ...block,
      text: block.text.slice(0, block.kind === "Owner candidate" ? 600 : 180),
      context: block.context.slice(0, 120),
    };
    if (
      JSON.stringify({ ...next, blocks: [...next.blocks, copy] }).length <=
      budget
    )
      next.blocks.push(copy);
  }
  return next;
}
export function productEvidence(sources: { url: string; content: string }[]) {
  return sources.flatMap((source) => {
    const doc = readDocument(source);
    return doc
      ? doc.blocks
          .filter((b) => b.kind === "Owner candidate")
          .map((b) => ({ url: source.url, content: b.text, blockId: b.id }))
      : [];
  });
}
