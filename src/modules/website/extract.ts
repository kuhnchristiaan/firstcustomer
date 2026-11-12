import { load } from "cheerio";
import { createHash } from "node:crypto";
import { setTimeout as delayUntil } from "node:timers/promises";
import robotsParser from "robots-parser";
import { normalizeUrl, safeFetch } from "./safe-fetch";
import { AppError } from "@/lib/errors";
import { classifyHtml } from "./classify-html";
import { limitDocument } from "./document";
export type Source = {
  url: string;
  title: string;
  content: string;
  contentHash: string;
  status: string;
};
export function extract(html: string, url: string) {
  const $ = load(html);
  const title = $("title").text().trim().slice(0, 200);
  const links = $("a[href]")
    .map((_, e) => $(e).attr("href"))
    .get();
  const document = classifyHtml($, url, title);
  const content = JSON.stringify(document);
  return {
    url,
    title,
    content,
    document,
    links,
    contentHash: createHash("sha256").update(content).digest("hex"),
    status: "SUCCESS",
  };
}
export async function crawl(
  input: string,
  maxPages: number,
  maxChars: number,
  signal: AbortSignal,
): Promise<Source[]> {
  const start = normalizeUrl(input);
  let origin = new URL(start).origin;
  const originalHost = new URL(start).hostname
    .replace(/^www\./i, "")
    .toLowerCase();
  const allowedRedirect = (_from: URL, to: URL) => {
    if (to.hostname.replace(/^www\./i, "").toLowerCase() !== originalHost)
      throw new AppError(
        "This website redirects to a different domain. Enter its final address.",
      );
  };
  const policies = new Map<string, Promise<ReturnType<typeof robotsParser>>>();
  const rulesFor = (siteOrigin: string) => {
    const cached = policies.get(siteOrigin);
    if (cached) return cached;
    const pending = (async () => {
      const robotsUrl = `${siteOrigin}/robots.txt`;
      const robots = await safeFetch(
        robotsUrl,
        signal,
        0,
        async (from, to) => {
          allowedRedirect(from, to);
          if (to.origin !== from.origin && to.pathname !== "/robots.txt")
            throw new AppError("Crawling restrictions could not be checked.");
        },
        true,
      );
      if (
        robots.status !== 404 &&
        robots.status !== 410 &&
        (robots.status < 200 || robots.status >= 300)
      )
        throw new AppError("Crawling restrictions could not be checked.");
      const rules = robotsParser(
        robotsUrl,
        robots.status === 404 || robots.status === 410 ? "" : robots.body,
      );
      return rules;
    })();
    policies.set(siteOrigin, pending);
    return pending;
  };
  const queue = [start];
  const seen = new Set<string>();
  const hashes = new Set<string>();
  const results: Source[] = [];
  let chars = 0;
  while (
    queue.length &&
    seen.size < Math.min(8, maxPages) &&
    chars < maxChars
  ) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    const rules = await rulesFor(new URL(url).origin);
    if (rules.isAllowed(url, "FirstCustomersBot") === false) continue;
    seen.add(url);
    if (results.length) {
      const waitMs = Math.max(
        300,
        (rules.getCrawlDelay("FirstCustomersBot") ?? 0) * 1000,
      );
      // Retain the first usable page rather than exhausting the AI deadline.
      // Never fetch another page sooner than the site's requested delay.
      if (waitMs > 10000) break;
      await delayUntil(waitMs, undefined, { signal });
    }
    try {
      const response = await safeFetch(url, signal, 0, async (from, to) => {
        allowedRedirect(from, to);
        const destinationRules = await rulesFor(to.origin);
        if (
          destinationRules.isAllowed(to.toString(), "FirstCustomersBot") ===
          false
        )
          throw new AppError("The website does not permit crawling this page.");
      });
      origin = new URL(response.url).origin;
      if (response.status < 200 || response.status >= 300) continue;
      const page = extract(response.body, response.url);
      if (!page.content || hashes.has(page.contentHash)) continue;
      hashes.add(page.contentHash);
      const document = limitDocument(
        page.document,
        Math.min(9000, maxChars - chars),
      );
      if (!document.blocks.some((b) => b.text.length >= 12)) continue;
      const content = JSON.stringify(document);
      results.push({
        ...page,
        content,
        contentHash: createHash("sha256").update(content).digest("hex"),
      });
      chars += results.at(-1)!.content.length;
      const candidates = page.links.flatMap((href) => {
        try {
          const link = new URL(href, response.url);
          link.hash = "";
          link.search = "";
          return link.origin === origin &&
            /about|product|service|solution|pricing|feature/i.test(
              link.pathname,
            )
            ? [link.toString()]
            : [];
        } catch {
          return [];
        }
      });
      queue.push(...candidates.filter((l) => !seen.has(l)).slice(0, 16));
    } catch (error) {
      if (!results.length || signal.aborted) throw error;
    }
  }
  if (!results.length || chars < 100)
    throw new AppError(
      "No useful website content was found. The site may require JavaScript or block crawling.",
    );
  return results;
}
