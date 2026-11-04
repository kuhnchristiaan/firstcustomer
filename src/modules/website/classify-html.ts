import type { CheerioAPI } from "cheerio";
import { createHash } from "node:crypto";
import {
  normalizeText,
  type EvidenceDocument,
  type EvidenceBlock,
} from "./document";
function blockId(url: string, text: string, context: string) {
  return createHash("sha256")
    .update(JSON.stringify([url, text, context]))
    .digest("hex")
    .slice(0, 12);
}

export function classifyHtml(
  $: CheerioAPI,
  url: string,
  title: string,
): EvidenceDocument {
  const blocks: EvidenceBlock[] = [];
  const seen = new Set<string>();
  const pageKind: EvidenceBlock["kind"] =
    /(?:^|\/)(?:examples?|demos?|preview|samples?)(?:\/|$)/i.test(
      new URL(url).pathname,
    )
      ? "Illustrative"
      : /(?:^|\/)(?:blog|stories|case-studies)(?:\/|$)/i.test(
            new URL(url).pathname,
          )
        ? "Editorial"
        : "Owner candidate";
  const add = (
    text: string,
    kind: EvidenceBlock["kind"],
    context: string,
    allowShort = false,
  ) => {
    text = normalizeText(text).slice(0, 1000);
    if (text.length < (allowShort ? 2 : 12) || seen.has(text)) return;
    seen.add(text);
    blocks.push({
      id: blockId(url, text, context),
      text,
      kind,
      context: context.slice(0, 200),
    });
  };
  for (const [label, selector] of [
    ["Website title", "title"],
    ["Website description", 'meta[name="description"]'],
    ["Site name", 'meta[property="og:site_name"]'],
    ["Open Graph description", 'meta[property="og:description"]'],
  ] as const) {
    const el = $(selector).first();
    add(el.attr("content") ?? el.text(), pageKind, label, true);
  }
  $("script[type='application/ld+json']").each((_, node) => {
    try {
      const data = JSON.parse($(node).text());
      const entries = Array.isArray(data)
        ? data
        : Array.isArray(data?.["@graph"])
          ? data["@graph"]
          : [data];
      for (const entry of entries.slice(0, 8)) {
        if (
          !entry ||
          typeof entry !== "object" ||
          ![
            "SoftwareApplication",
            "WebApplication",
            "Organization",
            "Product",
          ].includes(entry["@type"])
        )
          continue;
        if (
          typeof entry.url === "string" &&
          new URL(entry.url, url).origin !== new URL(url).origin
        )
          continue;
        // Unscoped Product JSON-LD may describe a demo or a third-party item.
        // Without an owner URL, require its name to agree with page branding.
        const metadataKind =
          entry["@type"] === "Product" &&
          !entry.url &&
          !(
            typeof entry.name === "string" &&
            normalizeText(
              title + " " + $("meta[property='og:site_name']").attr("content"),
            )
              .toLowerCase()
              .includes(entry.name.toLowerCase())
          )
            ? "Ambiguous"
            : pageKind;
        for (const field of ["name", "description", "applicationCategory"]) {
          if (typeof entry[field] === "string")
            add(
              entry[field],
              metadataKind,
              `Structured metadata: ${entry["@type"]} ${field}`,
            );
        }
      }
    } catch {
      /* Malformed/untrusted JSON-LD is data, never executable instructions. */
    }
  });
  $(
    "script,style,nav,header,footer,noscript,svg,iframe,form,[hidden],[aria-hidden='true']",
  ).remove();
  $("br").replaceWith(" ");
  const root = $("main").length ? $("main") : $("body");
  root
    .find("h1,h2,h3,h4,p,li,dt,dd,figcaption,blockquote,td")
    .each((_, node) => {
      const el = $(node);
      if (el.find("p,li,blockquote").length) return;
      let kind: EvidenceBlock["kind"] =
        el.is("blockquote") && pageKind === "Owner candidate"
          ? "Third party"
          : pageKind;
      const localHeading = normalizeText(
        el.is("h1,h2,h3,h4")
          ? el.text()
          : el.prevAll("h1,h2,h3,h4").first().text(),
      );
      if (
        /\b(?:fictional|illustrative|demonstration)|^(?:example|demo|sample)\b/i.test(
          localHeading,
        )
      )
        kind = "Illustrative";
      const contexts: string[] = localHeading ? [localHeading] : [];
      for (const ancestor of el
        .parents(
          "section,article,blockquote,[data-content-kind],[aria-label],[itemtype]",
        )
        .toArray()
        .slice(0, 6)) {
        const container = $(ancestor);
        const copy = container.clone();
        copy.find("section,article,blockquote").remove();
        const heading = normalizeText(
          copy.find("h1,h2,h3,figcaption").first().text(),
        );
        const label = [
          container.attr("aria-label"),
          container
            .attr("aria-labelledby")
            ?.split(/\s+/)
            .map((id) =>
              $("[id]")
                .filter((_, e) => $(e).attr("id") === id)
                .text(),
            )
            .join(" "),
          heading,
        ]
          .filter(Boolean)
          .join(" · ");
        const prelude = normalizeText(copy.find("p").slice(0, 2).text()).slice(
          0,
          250,
        );
        contexts.push(label);
        const marker = container.attr("data-content-kind");
        if (
          marker === "illustrative" ||
          /\billustrative|\bfictional|\bdemonstration|\bsample (?:report|data)|\bexample:/i.test(
            label + " " + prelude,
          ) ||
          /^(?:example|demo|sample)\b/i.test(label)
        )
          kind = "Illustrative";
        else if (
          kind !== "Illustrative" &&
          (marker === "third-party" ||
            container.is("blockquote") ||
            /testimonial|customer story|case study/i.test(label))
        )
          kind = "Third party";
        else if (
          kind === "Owner candidate" &&
          (marker === "editorial" ||
            /schema.org\/Article/.test(container.attr("itemtype") ?? ""))
        )
          kind = "Editorial";
      }
      add(el.text(), kind, contexts.filter(Boolean).reverse().join(" / "));
    });
  if (!blocks.some((b) => b.context !== "Website title" && b.text.length > 30))
    add(
      root.text(),
      "Ambiguous",
      "Unstructured content: product subject needs confirmation",
    );
  return { extractionVersion: "2.0", url, title, blocks };
}
