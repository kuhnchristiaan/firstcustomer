import { siteFixture } from "./product-attribution";
import { extract } from "@/modules/website/extract";
import { verifyClaims } from "@/modules/strategy/claims";
export function publisherClaimFixture() {
  const texts = [
    "Plausible is a lightweight and open-source Google Analytics alternative. Your website data is 100% yours and the privacy of your visitors is respected.",
    "Plausible is a simple, privacy-first alternative to Google Analytics. No cookies, no personal data, open source and hosted in the EU.",
    "Scroll depth from 1 to 100 percent is tracked automatically on every page. No setup, no tag managers. Create scroll depth goals without code.",
    "See which AI tools like ChatGPT, Perplexity, or Claude send you traffic. Identify pages that attract AI visitors and the conversions they complete.",
  ];
  const f = siteFixture({
    name: "Plausible Analytics",
    url: "https://plausible.io/",
    audience: "Privacy-conscious website owners",
    problem:
      "Understanding website traffic without an unnecessarily complex analytics workflow",
    summary: texts[0],
    demoName: "ExampleCRM",
    demo: "ExampleCRM illustrates an unrelated fictional contact-management product.",
    markup: 'data-content-kind="illustrative"',
  });
  const source = extract(
    f.html.replace(
      "</section>",
      texts
        .slice(1)
        .map((t) => `<p>${t}</p>`)
        .join("") + "</section>",
    ),
    f.source.url,
  );
  const profile = structuredClone(f.profile);
  profile.identity.category = "Product analytics";
  profile.statements = texts.map((text, i) => {
    const block = source.document.blocks.find((b) => b.text === text)!;
    return {
      id: i === 0 ? "owner-capability" : `capability-${i}`,
      text,
      kind: "Owner product claim" as const,
      subject: "Owner product" as const,
      evidence: [{ sourceUrl: source.url, blockId: block.id, quote: text }],
    };
  });
  profile.identity.evidence = profile.statements[0].evidence;
  const report = {
    ...f.report,
    schemaVersion: "1.1" as const,
    productIntelligence: profile,
    recommendationBasis: f.basis,
    overview: {
      text: texts[0],
      confidence: "Verified" as const,
      sources: [source.url],
    },
    offerings: texts.map((text) => ({
      text,
      confidence: "Verified" as const,
      sources: [source.url],
    })),
  };
  const legacy = structuredClone(report);
  const prior = (text: string) => ({
    text: verifyClaims({ text }, [], [], {}, false).value.text,
    confidence: "Unknown" as const,
    sources: [],
  });
  const stored = {
    ...legacy,
    overview: prior(texts[0]),
    offerings: texts.map(prior),
  };
  return { source, profile, report, stored, texts };
}
