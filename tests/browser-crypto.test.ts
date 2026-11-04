import { it, expect, vi } from "vitest";
import { ensureRandomUUID } from "@/lib/browser-crypto";
it("uses getRandomValues for RFC 4122 version 4 UUIDs when LAN HTTP has no randomUUID", () => {
  const getRandomValues = vi.fn((bytes: Uint8Array) => {
    bytes.fill(255);
    return bytes;
  });
  const crypto = { getRandomValues } as unknown as Crypto;
  ensureRandomUUID(crypto);
  expect(crypto.randomUUID()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  expect(getRandomValues).toHaveBeenCalledOnce();
});
it("preserves native secure UUID generation", () => {
  const native = vi.fn(() => "00000000-0000-4000-8000-000000000000" as const);
  const crypto = { randomUUID: native } as unknown as Crypto;
  ensureRandomUUID(crypto);
  expect(crypto.randomUUID).toBe(native);
});
it("fails closed without a cryptographic random source", () => {
  expect(() => ensureRandomUUID({} as Crypto)).toThrow("requires HTTPS");
});
