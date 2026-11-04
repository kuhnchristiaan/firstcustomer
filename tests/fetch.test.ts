import { beforeEach, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
const f = vi.hoisted(() => ({ lookup: vi.fn(), get: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: f.lookup }));
vi.mock("node:https", () => ({ default: { get: f.get } }));
import { safeFetch } from "@/modules/website/safe-fetch";
beforeEach(() => vi.resetAllMocks());
it("rejects mixed public/private DNS before connecting", async () => {
  f.lookup.mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ]);
  await expect(
    safeFetch("https://example.com", AbortSignal.timeout(1000)),
  ).rejects.toThrow("restricted network");
  expect(f.get).not.toHaveBeenCalled();
});
it("pins the selected DNS address and preserves the HTTPS hostname", async () => {
  f.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  f.get.mockImplementation((url, options, callback) => {
    expect(url.hostname).toBe("example.com");
    expect(options.family).toBe(4);
    const lookupCallback = vi.fn();
    options.lookup("example.com", {}, lookupCallback);
    expect(lookupCallback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
    const request = new EventEmitter();
    queueMicrotask(() => {
      const response = Object.assign(new EventEmitter(), {
        statusCode: 200,
        headers: { "content-type": "text/html" },
      });
      callback(response);
      response.emit("data", Buffer.from("<p>Hello website</p>"));
      response.emit("end");
    });
    return request;
  });
  await expect(
    safeFetch("https://example.com", AbortSignal.timeout(1000)),
  ).resolves.toMatchObject({ status: 200, body: "<p>Hello website</p>" });
  expect(f.lookup).toHaveBeenCalledTimes(1);
});
it("rejects cross-origin redirects before fetching their destination", async () => {
  f.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  f.get.mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter();
    queueMicrotask(() =>
      callback({
        statusCode: 302,
        headers: { location: "https://other.example.com" },
        resume: vi.fn(),
      }),
    );
    return req;
  });
  await expect(
    safeFetch("https://example.com", AbortSignal.timeout(1000)),
  ).rejects.toThrow("Cross-origin");
  expect(f.get).toHaveBeenCalledTimes(1);
});
it("aborts stalled DNS lookups", async () => {
  f.lookup.mockReturnValue(new Promise(() => {}));
  await expect(
    safeFetch("https://example.com", AbortSignal.timeout(20)),
  ).rejects.toThrow("lookup timed out");
});
it("rejects malformed redirects without an uncaught callback exception", async () => {
  f.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  f.get.mockImplementation((_url, _options, callback) => {
    const request = new EventEmitter();
    queueMicrotask(() =>
      callback({
        statusCode: 302,
        headers: { location: "https://[" },
        resume: vi.fn(),
      }),
    );
    return request;
  });
  await expect(
    safeFetch("https://example.com", AbortSignal.timeout(1000)),
  ).rejects.toThrow("invalid redirect");
});
