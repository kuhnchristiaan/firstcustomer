import type { Report } from "@/modules/intelligence/schema";

const inferred = (text: string) => ({
  text,
  confidence: "Inferred" as const,
  sources: [],
});

const unknown = (text: string) => ({
  text,
  confidence: "Unknown" as const,
  sources: [],
});

const base = {
  offerings: [
    inferred(
      "Onboarding funnel analytics to help SaaS teams locate trial drop-off.",
    ),
  ],
  problems: [
    inferred(
      "Small teams cannot tell which onboarding step prevents activation.",
    ),
  ],
  valueProposition: inferred(
    "Find one onboarding bottleneck to investigate without assembling a large analytics stack.",
  ),
  differentiators: [
    unknown(
      "Integration effort, supported analytics events and measurable activation improvements require confirmation.",
    ),
  ],
  industries: [inferred("B2B software and self-service SaaS.")],
  buyerPersonas: [
    inferred(
      "Founder, product manager or customer success lead responsible for trial activation.",
    ),
  ],
  geographicFocus: unknown(
    "Geographic coverage and data residency requirements are not established.",
  ),
  segments: [
    {
      name: "Founder-led SaaS",
      industry: "B2B software",
      customerType: "Small software teams",
      buyerRoles: ["Founder", "Product lead"],
      problems: ["Unexplained trial drop-off", "Limited time for analytics"],
      motivations: [
        "Understand activation barriers",
        "Prioritize one product improvement",
      ],
      buyingSignals: [
        "Publicly discussing onboarding problems",
        "Hiring a first product analyst",
      ],
      priority: 1,
      evidence: inferred(
        "A sample segment hypothesis requiring founder interviews.",
      ),
    },
  ],
  buyingSignals: [
    inferred(
      "A founder publicly asks for help understanding trial activation. This is a hypothetical signal, not a discovered lead.",
    ),
  ],
  missingInformation: [
    unknown(
      "Confirm integrations, pricing, security requirements, target geography and evidence of customer outcomes.",
    ),
  ],
};

const step = (title: string, detail: string) => ({
  title,
  recommendation: inferred(detail),
  steps: [
    "Choose one narrow audience and interview five founders.",
    "Write down objections and test one small experiment.",
  ],
  successMetric:
    "Five conversations; record replies and qualified trials, not impressions.",
});

export const mockReport: Report = {
  ...base,
  schemaVersion: "1.0",
  businessName: "Launchboard · sample SaaS",
  overview: inferred(
    "A sample onboarding analytics SaaS for small B2B software teams. This fixture does not describe your submitted website.",
  ),
  idealCustomers: [
    inferred("1. Founder-led B2B SaaS teams with 10–100 monthly trials."),
    inferred(
      "2. Product managers at small SaaS companies with onboarding drop-off.",
    ),
    inferred(
      "3. Customer success leads handling repetitive onboarding questions.",
    ),
  ],
  segments: [
    ...base.segments.map((s) => ({
      ...s,
      name: "Founder-led B2B SaaS",
      industry: "Software",
      customerType: "2–10 employees",
    })),
    { ...base.segments[0], name: "Small product teams", priority: 2 },
    { ...base.segments[0], name: "Customer success teams", priority: 3 },
  ],
  positioning: inferred(
    "For founder-led B2B SaaS teams who cannot explain trial drop-off, test positioning around finding the first broken onboarding step. Confirm that the product supports this outcome.",
  ),
  acquisitionChannels: [
    step(
      "Founder communities",
      "Test helpful onboarding teardowns in communities where the founder already participates. Community rules and demand require validation.",
    ),
    step(
      "Founder-led outbound",
      "Manually research a small relevant cohort. Personalize to a visible onboarding problem; do not claim you measured their conversion.",
    ),
    step(
      "Partner referrals",
      "Interview implementation consultants to test whether onboarding analytics is a recurring client need.",
    ),
  ],
  outreachTemplates: [
    {
      channel: "Personal email",
      subject: "A question about [product] onboarding",
      body: "Hi [name], I noticed [specific public observation]. How are you currently finding where trials get stuck? We are building [verified capability]. If relevant, I would value 15 minutes of feedback. No problem if this is not a priority.",
      rationale: inferred(
        "Lead with a real observation and a question. Replace placeholders with verified facts before use.",
      ),
    },
    {
      channel: "Community post",
      subject: "What makes SaaS trial onboarding difficult?",
      body: "I am researching onboarding for small SaaS teams. Which step creates the most support questions? Happy to share a short checklist based on the discussion if group rules allow.",
      rationale: inferred(
        "A research-first message tests the pain before promoting a product.",
      ),
    },
  ],
  firstTenPlaybook: [
    step(
      "Customers 1–3: discovery-led pilots",
      "Start with existing founder relationships. Offer a scoped paid pilot only after confirming a costly onboarding problem.",
    ),
    step(
      "Customers 4–6: repeat the narrow win",
      "Ask successful pilot customers for permission to document an outcome and one introduction. Do not invent testimonials.",
    ),
    step(
      "Customers 7–10: repeatable experiment",
      "Repeat the best performing message and channel in a small cohort. Track conversations, trials and paid conversions separately.",
    ),
  ],
  thirtyDayPlan: [1, 2, 3, 4].map((week) => ({
    week,
    objective: [
      "Validate the pain",
      "Test positioning",
      "Run a small pilot",
      "Review and repeat",
    ][week - 1],
    actions: [
      [
        "Interview five SaaS founders",
        "Record their exact language and current alternatives",
      ],
      [
        "Draft two evidence-backed messages",
        "Ask five target buyers which is clearer",
      ],
      [
        "Invite three qualified founders to a scoped pilot",
        "Track activation and objections",
      ],
      [
        "Review paid conversion and reasons for rejection",
        "Double down on one segment and stop weak experiments",
      ],
    ][week - 1],
    successMetric: [
      "Five interviews and one recurring problem",
      "Five message reviews and two qualified follow-ups",
      "Three pilot conversations; no guaranteed conversions",
      "A documented decision on segment, message and next experiment",
    ][week - 1],
    rationale: inferred(
      "Suggested experiment and target, not a forecast or evidence of market demand.",
    ),
  })),
};
