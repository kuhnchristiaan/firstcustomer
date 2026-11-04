import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { sameOrigin } from "@/lib/http";
beforeEach(() => {
  for (const [k, v] of Object.entries({
    DATABASE_URL: "postgresql://unused/test",
    NEON_AUTH_BASE_URL: "https://auth.example.com/auth",
    NEON_AUTH_COOKIE_SECRET: "test-only-cookie-secret-more-than-32-chars",
    APP_URL: "http://localhost:3000",
    DEV_LAN_ORIGIN: "http://192.168.0.3:3000",
    NODE_ENV: "development",
  }))
    vi.stubEnv(k, v);
});
afterEach(() => vi.unstubAllEnvs());
const request = (origin: string) =>
  new Request("http://localhost:3000/api/guest/session", {
    headers: { origin },
  });
it("allows only explicit local desktop and LAN origins during development", () => {
  expect(() => sameOrigin(request("http://localhost:3000"))).not.toThrow();
  expect(() => sameOrigin(request("http://192.168.0.3:3000"))).not.toThrow();
  expect(() => sameOrigin(request("https://attacker.example"))).toThrow(
    "Invalid request origin",
  );
});
it("ignores the LAN exception in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(() => sameOrigin(request("http://192.168.0.3:3000"))).toThrow(
    "Invalid request origin",
  );
  expect(() => sameOrigin(request("http://localhost:3000"))).not.toThrow();
});
