import { it, expect, vi, beforeEach } from "vitest";
import { AppError } from "@/lib/errors";
const mocks = vi.hoisted(() => ({ token: "a".repeat(43), session: vi.fn(), verify: vi.fn(), generate: vi.fn(), read: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: mocks.token }) }) }));
vi.mock("@/modules/config/env", () => ({ config: () => ({ APP_URL: "https://firstcustomers.example" }) }));
vi.mock("@/modules/guest/config", () => ({ guestConfig: () => ({ GUEST_IP_HASH_SECRET: "fixture-secret", TURNSTILE_SECRET_KEY: "fixture-turnstile" }) }));
vi.mock("@/modules/guest/security", () => ({ GUEST_COOKIE: "fc_guest", trustedIp: () => "127.0.0.1", ipFingerprint: () => "hashed-network", verifyTurnstile: mocks.verify }));
vi.mock("@/modules/guest/service", () => ({ sessionFromToken: mocks.session }));
vi.mock("@/modules/advisor/guest-service", () => ({ generateGuestAdvisor: mocks.generate, readGuestAdvisor: mocks.read }));
import { GET, POST } from "@/app/api/guest/advisor/route";
const body = { url: "https://senja.io/", context: { productStage: null, resources: { hoursPerWeek: 3, monthlyBudget: { amount: 0, currency: "USD" } }, previousEfforts: { channels: ["None"], other: null } }, turnstileToken: "fixture-check" };
const request = (value: unknown = body, origin = "https://firstcustomers.example") => new Request("https://firstcustomers.example/api/guest/advisor", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(value) });
beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({}); mocks.verify.mockResolvedValue(undefined); mocks.generate.mockResolvedValue({ status: "SUCCEEDED", data: { strategy: "compact-fixture" } }); });
it("requires same-origin requests before guest admission", async () => {
  expect((await POST(request(body,"https://untrusted.example"))).status).toBe(403);
  expect(mocks.session).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
});
it("rejects missing or invalid guest ownership before verification or AI", async () => {
  mocks.session.mockRejectedValue(new AppError("Unavailable",404));
  expect((await POST(request())).status).toBe(404);
  expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
});
it("does not allow missing verification or generation of follow-up operations anonymously", async () => {
  expect((await POST(request({...body,turnstileToken:""}))).status).toBe(400);
  expect((await POST(request({...body,kind:"task"}))).status).toBe(400);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("rejects failed Turnstile without consuming an AI attempt", async () => {
  mocks.verify.mockRejectedValue(new AppError("Security check failed",400));
  expect((await POST(request())).status).toBe(400);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("allows one verified guest generation without account login and preserves explicit zero budget", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(mocks.token,body.url,body.context,"hashed-network");
});
it("returns guest state privately and propagates failures without retries", async () => {
  mocks.read.mockResolvedValue({status:"EMPTY",data:null});
  const response = await GET();
  expect(mocks.read).toHaveBeenCalledExactlyOnceWith(mocks.token);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  mocks.generate.mockRejectedValue(new AppError("Attempt limit reached",429));
  expect((await POST(request())).status).toBe(429);
  expect(mocks.generate).toHaveBeenCalledTimes(1);
});
