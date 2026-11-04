import { it, expect } from "vitest";
import { extract } from "@/modules/website/extract";
import { readDocument, limitDocument } from "@/modules/website/document";
import {
  hydrateProductProfile,
  validateProductProfile,
  validateBasis,
} from "@/modules/intelligence/product-profile";
import {
  groundReport,
  strategyProductInput,
} from "@/modules/intelligence/attribution";
import { reportV11Schema } from "@/modules/intelligence/schema";
import {
  attributionSites,
  siteFixture,
  selectionOf,
} from "./fixtures/product-attribution";
it.each(attributionSites)(
  "attributes $name separately from its fictional demonstration",
  (site) => {
    const { source, profile, report, basis } = siteFixture(site);
    const doc = readDocument(source)!;
    expect(doc.blocks.find((b) => b.text === site.summary)).toMatchObject({
      kind: "Owner candidate",
    });
    expect(doc.blocks.find((b) => b.text === site.demo)).toMatchObject({
      kind: "Illustrative",
    });
    expect(
      doc.blocks.find((b) => b.text.startsWith("A third-party")),
    ).toMatchObject({ kind: "Third party" });
    expect(validateProductProfile(profile, [source])).toEqual(profile);
    expect(() => validateBasis(basis, profile)).not.toThrow();
    const output = reportV11Schema.parse({
      ...groundReport(report, profile, true),
      schemaVersion: "1.1",
      productIntelligence: profile,
      recommendationBasis: basis,
    });
    expect(output.businessName).toBe(site.name);
    expect(output.overview).toMatchObject({
      text: site.summary,
      confidence: "Verified",
    });
    expect(output.segments[0]).toMatchObject({
      name: site.audience,
      problems: [site.problem],
    });
    expect(output.acquisitionChannels[0].steps).toEqual([
      `Identify one relevant ${site.audience} buyer`,
      `Ask about ${site.problem}`,
    ]);
    expect(strategyProductInput(output)).toMatchObject({
      businessName: site.name,
      profile: {
        identity: {
          name: profile.identity.name,
          primaryJob: profile.identity.primaryJob,
        },
        statements: profile.statements.map(({ evidence, ...s }) => {
          void evidence;
          return s;
        }),
      },
      recommendationBasis: basis,
    });
    expect(
      output.recommendationBasis.every((b) =>
        b.statementIds.every((id) =>
          profile.statements.some(
            (s) => s.id === id && s.subject === "Owner product",
          ),
        ),
      ),
    ).toBe(true);
  },
);
it("rejects fabricated quotes, demo citations and unsupported recommendation links", () => {
  const { source, profile, basis } = siteFixture();
  const demo = source.document.blocks.find(
    (b) => b.kind === "Illustrative" && b.text.includes("diagnoses"),
  )!;
  const bad = structuredClone(profile);
  bad.statements[0].evidence[0] = {
    sourceUrl: source.url,
    blockId: demo.id,
    quote: demo.text,
  };
  expect(() => validateProductProfile(bad, [source])).toThrow(
    "attributed source",
  );
  bad.statements[0].evidence[0] = {
    ...profile.identity.evidence[0],
    quote: "An entirely fabricated website capability",
  };
  expect(() => validateProductProfile(bad, [source])).toThrow();
  expect(() =>
    validateBasis(
      basis.map((b) => ({ ...b, statementIds: ["fictional-demo"] })),
      profile,
    ),
  ).toThrow("actual product");
});
it("does not ban onboarding when it actually describes the owner's product", () => {
  const source = extract(
    "<main><h1>ActivationLens onboarding analytics</h1><p>ActivationLens diagnoses onboarding funnels and explains trial activation drop-off for SaaS teams.</p></main>",
    "https://activationlens.example/",
  );
  const block = source.document.blocks.find((b) =>
    b.text.includes("diagnoses"),
  )!;
  expect(block.kind).toBe("Owner candidate");
});
it("keeps persisted block boundaries valid under byte budgets and downgrades URL-only product assertions", () => {
  const { source, profile, report } = siteFixture();
  const limited = limitDocument(source.document, 2000);
  expect(() => JSON.parse(JSON.stringify(limited))).not.toThrow();
  expect(JSON.stringify(limited).length).toBeLessThanOrEqual(2000);
  report.overview = {
    text: "A different product capability",
    confidence: "Verified",
    sources: [source.url],
  };
  expect(groundReport(report, profile).overview).toMatchObject({
    confidence: "Unknown",
    sources: [],
  });
});

it("binds selected claims to exact owner quotations and refuses demonstration IDs", () => {
  const { source, profile } = siteFixture();
  const selection = selectionOf(profile);
  selection.statements[0].text = "Invented analytics capability";
  const hydrated = hydrateProductProfile(selection, [source]);
  expect(hydrated.statements[0].text).toBe(
    profile.statements[0].evidence[0].quote,
  );
  selection.statements[0].evidence[0].blockId = source.document.blocks.find(
    (b) => b.kind === "Illustrative",
  )!.id;
  expect(() => hydrateProductProfile(selection, [source])).toThrow();
});
it("keeps demo routes and editorial examples out of owner evidence", () => {
  for (const path of ["/demo", "/blog/example"]) {
    const source = extract(
      "<main><h1>Fictional revenue tools</h1><p>A fictional application diagnoses an unrelated business problem.</p></main>",
      `https://sample.example${path}`,
    );
    expect(
      source.document.blocks.every((b) => b.kind !== "Owner candidate"),
    ).toBe(true);
  }
});

it("recognizes unsectioned demonstration headings and ambiguous Product metadata", () => {
  const source = extract(
    `<title>BrightDesk</title><script type="application/ld+json">{"@type":"Product","name":"FictionalAtlas","description":"An unrelated fictional analytics service."}</script><main><h1>BrightDesk support inbox</h1><p>BrightDesk routes customer support messages to teams.</p><h2>Sample report</h2><p>FictionalAtlas measures advertising performance for shops.</p></main>`,
    "https://brightdesk.example/",
  );
  expect(
    source.document.blocks.find((b) =>
      b.text.startsWith("FictionalAtlas measures"),
    )?.kind,
  ).toBe("Illustrative");
  expect(
    source.document.blocks.find(
      (b) => b.text === "An unrelated fictional analytics service.",
    )?.kind,
  ).toBe("Ambiguous");
  expect(
    source.document.blocks.find((b) => b.text.startsWith("BrightDesk routes"))
      ?.kind,
  ).toBe("Owner candidate");
});
