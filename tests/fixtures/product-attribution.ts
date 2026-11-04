import { extract } from "@/modules/website/extract";
import { mockReport } from "@/modules/analysis/mock";
import type { ProductProfile } from "@/modules/intelligence/product-profile";
export function selectionOf(profile: ProductProfile) {
  const strip = (ref: ProductProfile["identity"]["evidence"][number]) => ({
    blockId: ref.blockId,
  });
  return {
    ...profile,
    identity: {
      ...profile.identity,
      evidence: profile.identity.evidence.map(strip),
    },
    statements: profile.statements.map((s) => ({
      ...s,
      evidence: s.evidence.map(strip),
    })),
  };
}
export const attributionSites = [
  {
    name: "FirstCustomers",
    url: "https://www.firstcustomers.app/",
    audience: "Early-stage SaaS founders",
    problem: "Finding a practical way to acquire first paying customers",
    summary:
      "FirstCustomers helps SaaS founders acquire their first customers through website analysis, ideal customer profiles, sales messaging, acquisition experiments and 30-day action plans.",
    demoName: "Launchboard",
    demo: "Launchboard diagnoses onboarding funnels and identifies why trial users fail to activate.",
    markup:
      'data-content-kind="illustrative" aria-label="Illustrative fictional company"',
  },
  {
    name: "LedgerLane",
    url: "https://ledgerlane.example/",
    audience: "Independent bookkeeping firms",
    problem: "Chasing overdue invoices manually",
    summary:
      "LedgerLane provides invoice reminders and receivables tracking for independent bookkeeping firms.",
    demoName: "MealGarden",
    demo: "MealGarden creates meal plans and nutrition coaching for athletes.",
    markup: 'aria-labelledby="demo-heading"',
  },
];
export function siteFixture(site = attributionSites[0]) {
  const html = `<html><head><title>${site.name} — product</title><meta name="description" content="${site.summary}"/></head><body><main><section><h1>${site.name}</h1><p>${site.summary}</p><p>For ${site.audience} facing ${site.problem}.</p></section><section ${site.markup}><h2 id="demo-heading">Fictional demonstration: ${site.demoName}</h2><p>${site.demo}</p><p>Example customers should discuss this fictional product's workflow.</p></section><section aria-label="Customer story"><blockquote>A third-party platform helps our trial activation team.</blockquote></section></main></body></html>`;
  const source = extract(html, site.url);
  const block = source.document.blocks.find(
    (b) => b.text === site.summary && b.kind === "Owner candidate",
  )!;
  const ref = { sourceUrl: site.url, blockId: block.id, quote: site.summary };
  const profile: ProductProfile = {
    version: "1.0",
    identity: {
      name: site.name,
      summary: site.summary,
      category:
        site.name === "FirstCustomers"
          ? "Customer acquisition"
          : "Finance operations",
      primaryJob: {
        actor: site.audience,
        problem: site.problem,
        outcome: site.summary,
      },
      certainty: "Website-supported",
      evidence: [ref],
    },
    statements: [
      {
        id: "owner-capability",
        text: site.summary,
        kind: "Owner product claim",
        subject: "Owner product",
        evidence: [ref],
      },
    ],
    limitations: ["Demand and channel performance have not been validated."],
  };
  const report = structuredClone(mockReport);
  report.businessName = site.name;
  report.overview = {
    text: site.summary,
    confidence: "Verified",
    sources: [site.url],
  };
  report.offerings = [report.overview];
  report.idealCustomers = [1, 2, 3].map((n) => ({
    text: `${n}. ${site.audience} facing ${site.problem}`,
    confidence: "Inferred",
    sources: [],
  }));
  report.industries = [
    { text: "Business software", confidence: "Inferred", sources: [] },
  ];
  report.buyerPersonas = [
    { text: site.audience, confidence: "Inferred", sources: [] },
  ];
  report.buyingSignals = [
    {
      text: `A buyer publicly seeks help with ${site.problem}. Hypothesis requiring manual qualification.`,
      confidence: "Inferred",
      sources: [],
    },
  ];

  report.problems = [
    { text: site.problem, confidence: "Inferred", sources: [] },
  ];
  report.valueProposition = {
    text: site.summary,
    confidence: "Inferred",
    sources: [],
  };
  report.segments = report.segments.map((s, i) => ({
    ...s,
    name:
      i === 0 ? site.audience : `Specialist ${site.audience} segment ${i + 1}`,
    industry: "Business software",
    buyerRoles: [site.audience],
    problems: [site.problem],
    motivations: ["Reduce uncertainty in this workflow"],
    buyingSignals: ["The buyer confirms this problem is a priority"],
    evidence: {
      text: site.summary,
      confidence: "Verified",
      sources: [site.url],
    },
  }));
  report.idealCustomers = report.segments.map((s) => ({
    text: s.name,
    confidence: "Inferred",
    sources: [],
  }));
  report.industries = [
    { text: "Business software", confidence: "Inferred", sources: [] },
  ];
  report.buyerPersonas = report.idealCustomers;
  report.buyingSignals = [
    {
      text: "The buyer confirms the problem",
      confidence: "Inferred",
      sources: [],
    },
  ];
  report.acquisitionChannels = report.acquisitionChannels.map((c, i) => ({
    ...c,
    title: `Buyer interview experiment ${i + 1}`,
    recommendation: {
      text: `Ask ${site.audience} about ${site.problem}.`,
      confidence: "Inferred",
      sources: [],
    },
    steps: [
      `Identify one relevant ${site.audience} buyer`,
      `Ask about ${site.problem}`,
    ],
    successMetric: "A qualified buyer confirms urgency and a next step",
  }));
  report.firstTenPlaybook = report.acquisitionChannels;
  report.positioning = {
    text: `For ${site.audience}: ${site.summary}`,
    confidence: "Inferred",
    sources: [],
  };
  report.outreachTemplates = report.outreachTemplates.map((m) => ({
    ...m,
    body: `How do you currently handle ${site.problem}?`,
    subject: `Question about ${site.name}`,
    rationale: report.positioning,
  }));
  report.thirtyDayPlan = report.thirtyDayPlan.map((w) => ({
    ...w,
    objective: `Validate ${site.problem}`,
    actions: [
      `Identify a suitable ${site.audience} buyer`,
      `Ask about ${site.problem}`,
    ],
    rationale: report.positioning,
  }));
  const basis = (
    [
      "segments",
      "acquisitionChannels",
      "outreachTemplates",
      "firstTenPlaybook",
      "thirtyDayPlan",
    ] as const
  ).map((section) => ({ section, statementIds: ["owner-capability"] }));
  return { html, source, profile, report, basis };
}
