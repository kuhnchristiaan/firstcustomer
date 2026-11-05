import { reasoningPath, completeRepairText } from "./completeness";
import { z } from "zod";
import type { QualityIssue } from "./quality";

const forbidden = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "schemaVersion",
  "contractVersion",
  "pricingStatementIds",
  "offerKind",
  "confidence",
  "sources",
  "recommendationBasis",
  "productIntelligence",
  "businessName",
  "overview",
  "offerings",
]);
export function leafFields(
  value: unknown,
  prefix = "",
): Record<string, string | number | boolean> {
  if (["string", "number", "boolean"].includes(typeof value))
    return { [prefix]: value as string | number | boolean };
  if (!value || typeof value !== "object") return {};
  return Object.assign(
    {},
    ...Object.entries(value)
      .filter(([k]) => !forbidden.has(k))
      .map(([k, v]) => leafFields(v, prefix ? `${prefix}.${k}` : k)),
  );
}
/** Required flat dot-path keys: no JSON pointers, additions, deletions or section replacements. */
export function fieldPatch(
  candidate: Record<string, unknown>,
  fields: Record<string, z.ZodType>,
  issues: QualityIssue[],
) {
  const leaves = leafFields(
    Object.fromEntries(Object.keys(fields).map((k) => [k, candidate[k]])),
  );
  const paths = new Set<string>();
  for (const issue of issues) {
    const explicit =
      issue.path ??
      issue.reason.match(/(?:field:|in |: )([\w]+(?:\.\w+)+)$/)?.[1];
    if (explicit) {
      if (!Object.hasOwn(leaves, explicit))
        throw new Error("quality_invalid_field");
      paths.add(explicit);
    } else if (Object.hasOwn(leaves, issue.section)) paths.add(issue.section);
    else throw new Error("quality_requires_exact_field");
  }
  // A pricing downgrade may remove invalid citations, never invent or replace evidence.
  const clearPricing = paths.has("paymentPath.monetizationStatus") &&
    Array.isArray((candidate.paymentPath as { pricingStatementIds?: unknown[] })?.pricingStatementIds) &&
    ((candidate.paymentPath as { pricingStatementIds: unknown[] }).pricingStatementIds.length > 0);
  if (clearPricing) paths.add("paymentPath.pricingStatementIds");
  const schemaAt = (path: string): z.ZodType | undefined => {
    const [root, ...keys] = path.split(".");
    let node = fields[root];
    for (const key of keys) {
      if (node instanceof z.ZodObject) node = node.shape[key];
      else if (node instanceof z.ZodArray) node = node.element as z.ZodType;
      else return undefined;
    }
    return node;
  };
  // Coordinated repairs can include several exact fields, but never a whole section.
  if (!paths.size || paths.size > 12)
    throw new Error("quality_patch_too_broad");
  const wireShape: Record<string, z.ZodType> = {};
  const shape = Object.fromEntries(
    [...paths].sort().map((path) => {
      if (path === "paymentPath.pricingStatementIds") return [path, z.array(z.string()).length(0)];
      if (clearPricing && path === "paymentPath.monetizationStatus") return [path, z.literal("Unknown")];
      const original = schemaAt(path);
      if (original instanceof z.ZodString && reasoningPath.test(path)) {
        // The provider's regex dialect rejects lookahead. Keep the strict
        // completeness check locally; wire constraints retain original bounds.
        wireShape[path] = original.describe("Rewrite as one short complete sentence within maxLength; no dangling clause or cut-off qualification.");
        return [path, original.regex(completeRepairText, "Finish the reasoning component; no dangling clause")];
      }
      if (original) return [path, original];
      const value = leaves[path];
      return [
        path,
        typeof value === "string"
          ? z.string().max(450)
          : typeof value === "number"
            ? z.number()
            : z.boolean(),
      ];
    }),
  );
  return {
    paths: [...paths].sort(),
    schema: z.strictObject(shape),
    wireSchema: z.strictObject({ ...shape, ...wireShape }),
    apply(raw: unknown) {
      const patch = z.strictObject(shape).parse(raw);
      const next = structuredClone(candidate);
      for (const [path, value] of Object.entries(patch)) {
        const keys = path.split(".");
        let parent: Record<string, unknown> = next;
        for (const key of keys.slice(0, -1)) {
          if (forbidden.has(key) || !Object.hasOwn(parent, key))
            throw new Error("invalid_patch_path");
          parent = parent[key] as Record<string, unknown>;
        }
        parent[keys.at(-1)!] = value;
      }
      return next;
    },
  };
}
