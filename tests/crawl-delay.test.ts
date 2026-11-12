import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ fetch: vi.fn(), delay: vi.fn() }));
vi.mock("@/modules/website/safe-fetch", async (original) => ({
  ...(await original<typeof import("@/modules/website/safe-fetch")>()),
  safeFetch: f.fetch,
}));
vi.mock("node:timers/promises", () => ({ setTimeout: f.delay }));
import { crawl } from "@/modules/website/extract";
const html = `<html><head><title>Example SaaS</title></head><body><main><h1>Example software for customer feedback</h1><p>Our software helps teams collect, organize and respond to customer feedback.</p><a href="/pricing">Pricing details</a></main></body></html>`;
const second = `<html><head><title>Pricing</title></head><body><main><h1>Plans for customer feedback</h1><p>Choose a plan that fits the size of your organization and its feedback needs.</p></main></body></html>`;
const result = (url: string, body: string, type = "text/html") => ({
  url,
  body,
  type,
  status: 200,
});
beforeEach(() => {
  vi.resetAllMocks();
  f.delay.mockResolvedValue(undefined);
});
function setup(seconds: number) {
  f.fetch.mockImplementation(async (url: string) =>
    url.endsWith("/robots.txt")
      ? result(
          url,
          `User-agent: *\nCrawl-delay: ${seconds}\nAllow: /`,
          "text/plain",
        )
      : result(url, url.endsWith("/pricing") ? second : html),
  );
}
it("supports a five-second crawl delay while waiting before the next page", async () => {
  setup(5);
  const signal = AbortSignal.timeout(2000);
  const sources = await crawl("https://example.com/", 2, 20000, signal);
  expect(sources).toHaveLength(2);
  expect(f.delay).toHaveBeenCalledExactlyOnceWith(5000, undefined, { signal });
});
it("uses the first page and avoids an excessively long additional-page delay", async () => {
  setup(60);
  const sources = await crawl(
    "https://example.com/",
    2,
    20000,
    AbortSignal.timeout(2000),
  );
  expect(sources).toHaveLength(1);
  expect(f.delay).not.toHaveBeenCalled();
  expect(f.fetch).toHaveBeenCalledTimes(2);
});
it("honors the processing abort when waiting between pages", async () => {
  setup(5);
  f.delay.mockRejectedValue(new DOMException("Aborted", "AbortError"));
  await expect(
    crawl("https://example.com/", 2, 20000, AbortSignal.timeout(2000)),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(f.fetch).toHaveBeenCalledTimes(2);
});
