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

it("revalidates redirected DNS and never connects to a private destination", async () => {
  f.lookup.mockImplementation(async (host: string) => [
    {
      address: host === "example.com" ? "93.184.216.34" : "127.0.0.1",
      family: 4,
    },
  ]);
  f.get.mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter();
    queueMicrotask(() =>
      callback({
        statusCode: 301,
        headers: { location: "https://www.example.com/" },
        resume: vi.fn(),
      }),
    );
    return req;
  });
  await expect(
    safeFetch(
      "https://example.com/",
      AbortSignal.timeout(1000),
      0,
      async () => {},
    ),
  ).rejects.toThrow("restricted network");
  expect(f.get).toHaveBeenCalledTimes(1);
  expect(f.lookup).toHaveBeenCalledTimes(2);
});
it("rejects an HTTPS downgrade even when a redirect policy is supplied", async () => {
  f.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  f.get.mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter();
    queueMicrotask(() =>
      callback({
        statusCode: 301,
        headers: { location: "http://example.com/" },
        resume: vi.fn(),
      }),
    );
    return req;
  });
  await expect(
    safeFetch(
      "https://example.com/",
      AbortSignal.timeout(1000),
      0,
      async () => {},
    ),
  ).rejects.toThrow("Unsafe website redirect");
  expect(f.get).toHaveBeenCalledTimes(1);
});
it("treats a missing robots file without a content type as an allowed missing file only when explicitly requested", async () => {
  f.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  f.get.mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter();
    queueMicrotask(() => {
      const res = Object.assign(new EventEmitter(), {
        statusCode: 404,
        headers: {},
      });
      callback(res);
      res.emit("end");
    });
    return req;
  });
  await expect(
    safeFetch(
      "https://example.com/robots.txt",
      AbortSignal.timeout(1000),
      0,
      undefined,
      true,
    ),
  ).resolves.toMatchObject({ status: 404, body: "" });
});

it("preserves missing-robots handling across a safe redirect", async () => {
  f.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  f.get.mockImplementation((url, _options, callback) => {
    const req = new EventEmitter();
    queueMicrotask(() => {
      if (url.hostname === "example.com")
        callback({
          statusCode: 301,
          headers: { location: "https://www.example.com/robots.txt" },
          resume: vi.fn(),
        });
      else {
        const res = Object.assign(new EventEmitter(), {
          statusCode: 404,
          headers: {},
        });
        callback(res);
        res.emit("end");
      }
    });
    return req;
  });
  await expect(
    safeFetch(
      "https://example.com/robots.txt",
      AbortSignal.timeout(1000),
      0,
      async () => {},
      true,
    ),
  ).resolves.toMatchObject({ status: 404, body: "" });
  expect(f.get).toHaveBeenCalledTimes(2);
});
