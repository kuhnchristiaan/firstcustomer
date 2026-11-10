import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/modules/website/safe-fetch", async (original) => ({
  ...(await original<typeof import("@/modules/website/safe-fetch")>()),
  safeFetch: f.fetch,
}));
import { crawl } from "@/modules/website/extract";
const html = `<html><head><title>Example SaaS</title></head><body><main><h1>Example software for customer feedback</h1><p>Our software helps teams collect, organize and respond to customer feedback.</p></main></body></html>`;
const result = (url: string, body: string, type = "text/html") => ({
  url,
  body,
  type,
  status: 200,
});
beforeEach(() => vi.resetAllMocks());
it("checks destination robots before following a common canonical redirect", async () => {
  const calls: string[] = [];
  f.fetch.mockImplementation(
    async (
      url: string,
      _signal: AbortSignal,
      _count: number,
      guard?: (from: URL, to: URL) => Promise<void>,
    ) => {
      calls.push(url);
      if (url === "http://example.com/robots.txt") {
        await guard?.(
          new URL(url),
          new URL("https://www.example.com/robots.txt"),
        );
        return result(
          "https://www.example.com/robots.txt",
          "User-agent: *\nAllow: /",
          "text/plain",
        );
      }
      if (url === "http://example.com/") {
        await guard?.(new URL(url), new URL("https://www.example.com/"));
        calls.push("destination-page");
        return result("https://www.example.com/", html);
      }
      if (url === "https://www.example.com/robots.txt")
        return result(url, "User-agent: *\nAllow: /", "text/plain");
      throw Error(`Unexpected request: ${url}`);
    },
  );
  const sources = await crawl(
    "http://example.com/",
    1,
    20000,
    AbortSignal.timeout(2000),
  );
  expect(sources[0].url).toBe("https://www.example.com/");
  expect(calls.indexOf("https://www.example.com/robots.txt")).toBeLessThan(
    calls.indexOf("destination-page"),
  );
});
it("never fetches a redirected page prohibited by destination robots", async () => {
  let destinationFetched = false;
  f.fetch.mockImplementation(
    async (
      url: string,
      _signal: AbortSignal,
      _count: number,
      guard?: (from: URL, to: URL) => Promise<void>,
    ) => {
      if (url === "https://example.com/robots.txt")
        return result(url, "User-agent: *\nAllow: /", "text/plain");
      if (url === "https://example.com/") {
        await guard?.(new URL(url), new URL("https://www.example.com/private"));
        destinationFetched = true;
        return result("https://www.example.com/private", html);
      }
      if (url === "https://www.example.com/robots.txt")
        return result(url, "User-agent: *\nDisallow: /private", "text/plain");
      throw Error("Unexpected request");
    },
  );
  await expect(
    crawl("https://example.com/", 1, 20000, AbortSignal.timeout(2000)),
  ).rejects.toThrow("does not permit");
  expect(destinationFetched).toBe(false);
});
it("rejects a redirect to an unrelated domain before contacting it", async () => {
  f.fetch.mockImplementation(
    async (
      url: string,
      _signal: AbortSignal,
      _count: number,
      guard?: (from: URL, to: URL) => Promise<void>,
    ) => {
      if (url.endsWith("/robots.txt"))
        return result(url, "User-agent: *\nAllow: /", "text/plain");
      await guard?.(new URL(url), new URL("https://other.example/"));
      throw Error("should not be contacted");
    },
  );
  await expect(
    crawl("https://example.com/", 1, 20000, AbortSignal.timeout(2000)),
  ).rejects.toThrow("different domain");
  expect(f.fetch).toHaveBeenCalledTimes(2);
});
