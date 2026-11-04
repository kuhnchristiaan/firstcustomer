import { it, expect } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { reportV1Schema } from "@/modules/intelligence/schema";
import {
  reportTextFormat,
  ProviderOutputError,
} from "@/modules/analysis/provider";
import { analysisFailure } from "@/modules/analysis/failure";
import { AppError } from "@/lib/errors";
function expand(schema: Record<string, unknown>) {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const object = node as Record<string, unknown>;
    if (typeof object.$ref === "string") {
      const target = object.$ref
        .split("/")
        .slice(1)
        .reduce<unknown>(
          (v, key) =>
            (v as Record<string, unknown>)[
              decodeURIComponent(key).replace(/~1/g, "/").replace(/~0/g, "~")
            ],
          schema,
        );
      if (!target) throw Error("Unresolved schema reference");
      return walk({
        ...(target as object),
        ...Object.fromEntries(
          Object.entries(object).filter(([key]) => key !== "$ref"),
        ),
      });
    }
    return Object.fromEntries(
      Object.entries(object)
        .filter(([key]) => !["$defs", "definitions"].includes(key))
        .map(([key, value]) => [key, walk(value)]),
    );
  };
  return walk(schema);
}
it("shares repeated JSON schema definitions without weakening any report constraint", () => {
  const inline = zodTextFormat(reportV1Schema, "report").schema;
  const compact = reportTextFormat(reportV1Schema, "report").schema;
  expect(expand(compact)).toEqual(expand(inline));
  expect(Buffer.byteLength(JSON.stringify(compact))).toBeLessThan(
    Buffer.byteLength(JSON.stringify(inline)) * 0.6,
  );
});
it("returns useful processing-limit and uncertainty messages without leaking provider details", () => {
  expect(
    analysisFailure(new ProviderOutputError(100, 50, "input_budget")),
  ).toMatchObject({
    status: 422,
    message: expect.stringContaining("main product page"),
  });
  expect(
    analysisFailure(
      new ProviderOutputError(100, 50, "product_identity_uncertain"),
    ).message,
  ).toContain("confidently identify");
  const raw = new Error(
    "private provider credential must never reach the user",
  );
  expect(analysisFailure(raw).message).not.toContain(raw.message);
  const validation = new AppError("Use a public product URL", 400);
  expect(analysisFailure(validation)).toBe(validation);
});
