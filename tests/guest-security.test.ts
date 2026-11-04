import { it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  newGuestToken,
  tokenHash,
  ipFingerprint,
  trustedIp,
  verifyTurnstile,
} from "@/modules/guest/security";
import { guestConfig } from "@/modules/guest/config";
function env() {
  for (const [k, v] of Object.entries({
    GUEST_ANALYSIS_ENABLED: "true",
    GUEST_IP_MODE: "local",
    GUEST_IP_HASH_SECRET: "a".repeat(48),
    TURNSTILE_SECRET_KEY: "real-test-secret-for-unit-tests",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "real-test-site-key",
    GUEST_PRICED_MODEL: "gpt-4.1-mini",
    OPENAI_MODEL: "gpt-4.1-mini",
    GUEST_INPUT_USD_PER_MILLION: "0.4",
    GUEST_OUTPUT_USD_PER_MILLION: "1.6",
    GUEST_MAX_COST_USD: "0.03",
  }))
    vi.stubEnv(k, v);
}
beforeEach(env);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("creates high-entropy tokens and stores only a stable hash", () => {
  const a = newGuestToken(),
    b = newGuestToken();
  expect(a).toHaveLength(43);
  expect(a).not.toBe(b);
  expect(tokenHash(a)).toHaveLength(64);
  expect(tokenHash(a)).not.toContain(a);
  expect(tokenHash(a)).toBe(tokenHash(a));
});
it.each([undefined, "", "predictable-id", "a".repeat(44)])(
  "rejects malformed tokens",
  (token) => expect(() => tokenHash(token)).toThrow(),
);
it("rotates private IP fingerprints daily", () => {
  const a = ipFingerprint("203.0.113.1", "secret", new Date("2026-11-04"));
  expect(a).not.toContain("203.0.113.1");
  expect(a).not.toBe(
    ipFingerprint("203.0.113.1", "secret", new Date("2026-11-05")),
  );
});
it("ignores forged forwarding headers locally", () => {
  expect(
    trustedIp(
      new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "8.8.8.8",
          "x-vercel-forwarded-for": "8.8.8.8",
        },
      }),
      guestConfig(),
    ),
  ).toBe("127.0.0.1");
});
it("does not trust Vercel headers outside a Vercel deployment", () => {
  vi.stubEnv("GUEST_IP_MODE", "vercel");
  vi.stubEnv("VERCEL", "");
  expect(() =>
    trustedIp(
      new Request("http://localhost", {
        headers: { "x-vercel-forwarded-for": "8.8.8.8" },
      }),
      guestConfig(),
    ),
  ).toThrow("metadata");
});
it("uses only the platform header on Vercel", () => {
  vi.stubEnv("GUEST_IP_MODE", "vercel");
  vi.stubEnv("VERCEL", "1");
  expect(
    trustedIp(
      new Request("https://example.com", {
        headers: {
          "x-forwarded-for": "1.1.1.1",
          "x-vercel-forwarded-for": "8.8.8.8",
        },
      }),
      guestConfig(),
    ),
  ).toBe("8.8.8.8");
});
it("fails closed when rates do not match the configured model or budget", () => {
  vi.stubEnv("GUEST_PRICED_MODEL", "unpriced-model");
  expect(() => guestConfig()).toThrow("cost");
  vi.stubEnv("GUEST_PRICED_MODEL", "gpt-4.1-mini");
  vi.stubEnv("GUEST_MAX_COST_USD", "0.0001");
  expect(() => guestConfig()).toThrow("cost");
});
it("forbids localhost IP mode and dummy Turnstile keys in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(() => guestConfig()).toThrow("protection");
  vi.stubEnv("GUEST_IP_MODE", "vercel");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
  expect(() => guestConfig()).toThrow("protection");
});
it("requires a Turnstile token without making a request", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    verifyTurnstile("", "secret", "https://example.com"),
  ).rejects.toThrow("security check");
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects failed, mismatched-host and mismatched-action Turnstile responses", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  for (const result of [
    { success: false },
    { success: true, hostname: "attacker.com", action: "guest_analysis" },
    { success: true, hostname: "example.com", action: "wrong" },
  ]) {
    fetch.mockResolvedValue(Response.json(result));
    await expect(
      verifyTurnstile("token", "real-secret", "https://example.com"),
    ).rejects.toThrow("Security check failed");
  }
});
it("validates Turnstile on the server and avoids sending raw IP data", async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      success: true,
      hostname: "example.com",
      action: "guest_analysis",
    }),
  );
  vi.stubGlobal("fetch", fetch);
  await expect(
    verifyTurnstile("token", "real-secret", "https://example.com"),
  ).resolves.toBeUndefined();
  expect(String(fetch.mock.calls[0][1].body)).not.toContain("remoteip");
});
