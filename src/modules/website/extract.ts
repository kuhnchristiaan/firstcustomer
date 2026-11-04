import { load } from "cheerio";
import { createHash } from "node:crypto";
import robotsParser from "robots-parser";
import { normalizeUrl, safeFetch } from "./safe-fetch";
import { AppError } from "@/lib/errors";
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
  $("script,style,nav,header,footer,noscript,svg,iframe,form").remove();
  const root = $("main").length ? $("main") : $("body");
  const content = [
    ...new Set(
      root
        .text()
        .split(/\n+/)
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter((s) => s.length > 20),
    ),
  ].join("\n");
  return {
    url,
    title,
    content,
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
  const origin = new URL(start).origin;
  const robots = await safeFetch(`${origin}/robots.txt`, signal);
  if (
    robots.status !== 404 &&
    robots.status !== 410 &&
    (robots.status < 200 || robots.status >= 300)
  )
    throw new AppError("Crawling restrictions could not be checked.");
  const rules = robotsParser(
    `${origin}/robots.txt`,
    robots.status === 404 || robots.status === 410 ? "" : robots.body,
  );
  const delay = rules.getCrawlDelay("FirstCustomersBot") ?? 0;
  if (delay > 3)
    throw new AppError(
      "This site requests a crawl delay beyond the analysis time budget.",
    );
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
    if (seen.has(url) || rules.isAllowed(url, "FirstCustomersBot") === false)
      continue;
    seen.add(url);
    if (results.length)
      await new Promise((r) => setTimeout(r, Math.max(300, delay * 1000)));
    try {
      const response = await safeFetch(url, signal);
      if (new URL(response.url).origin !== origin)
        throw new AppError("Use the final website URL after redirects.");
      if (rules.isAllowed(response.url, "FirstCustomersBot") === false)
        continue;
      if (response.status < 200 || response.status >= 300) continue;
      const page = extract(response.body, response.url);
      if (!page.content || hashes.has(page.contentHash)) continue;
      hashes.add(page.contentHash);
      results.push({
        ...page,
        content: page.content.slice(0, Math.min(9000, maxChars - chars)),
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
