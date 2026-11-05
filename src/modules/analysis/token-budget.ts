import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";

let encoder: Tiktoken | undefined;
/** Count the complete wire body (including JSON schema), with room for API framing.
 * Unknown model encodings fail conservatively using the previous byte bound.
 * This is a reservation, not a billed token count or a substitute for actual usage.
 */
export function estimateRequestTokens(request: unknown, model: string) {
  const text = JSON.stringify(request);
  if (!/^gpt-(?:4\.1|4o)(?:-|$)/.test(model))
    return {
      method: "utf8-bound" as const,
      tokens: Buffer.byteLength(text, "utf8") + 1024,
    };
  encoder ??= new Tiktoken(o200k);
  // Treat special-token-looking website content as ordinary untrusted text.
  const encoded = encoder.encode(text, [], []).length;
  return {
    method: "o200k_base" as const,
    tokens: Math.ceil(encoded * 1.25) + 512,
  };
}

export function fitsInputBudget(
  request: unknown,
  model: string,
  used: number,
  cap: number,
) {
  return used + estimateRequestTokens(request, model).tokens <= cap;
}

export function assertActualUsage(
  used: { input: number; output: number },
  limits: { input: number; output: number },
) {
  if (used.input > limits.input || used.output > limits.output)
    throw new Error("actual_token_budget_exceeded");
}
