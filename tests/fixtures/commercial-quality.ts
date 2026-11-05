import { siteFixture } from "./product-attribution";
import { groundReport } from "@/modules/intelligence/attribution";
import { reportV11Schema } from "@/modules/intelligence/schema";
import { experimentFor } from "./experiment";

// Hand-authored regression expectations from the supplied reports, not model runs.
export const commercialCases = [
  {
    name: "Senja",
    url: "https://senja.io/",
    audience: "Independent course creators",
    summary:
      "The easiest way to collect testimonials and add them to your website.",
    problem: "Chasing learner feedback before the next course launch",
    buyers: [
      "Course creator",
      "Agency account director",
      "B2B SaaS customer marketer",
    ],
    pains: [
      "Learner feedback is scattered before launch",
      "Client approvals delay publishing project proof",
      "Sales teams cannot find relevant customer proof",
    ],
    channels: [
      "Creator peer-group discussion",
      "Agency partner introductions",
      "Manual email to customer marketers",
    ],
    action:
      "Read one accessible creator group's rules; ask permission to discuss collecting learner feedback",
    message:
      "Hi [name], how do you collect learner feedback before your next course launch? I am exploring whether Senja fits this workflow. Would you discuss where the process gets stuck? No purchase expected.",
    alternative:
      "Agency introductions may win if the founder already has trusted agency relationships; access is currently unknown.",
  },
  {
    name: "Greensighter",
    url: "https://ai.greensighter.com/",
    audience: "Small software product teams",
    summary:
      "Assign design tickets in Jira, Linear, Asana or ClickUp and get designs in your Figma in 24–48 hours, with a human reviewer in the loop.",
    problem: "UI tickets wait for scarce design capacity before a release",
    buyers: [
      "Founder with a UI backlog",
      "Agency delivery director",
      "Design operations lead",
    ],
    pains: [
      "Release tickets stall awaiting design capacity",
      "Client delivery peaks exceed agency designer availability",
      "Several squads compete for design system support",
    ],
    channels: [
      "Manual email to product founders",
      "Agency referral conversations",
      "Design-operations community discussion",
    ],
    action:
      "Manually identify three product founders by public role; ask about design-ticket delays without assuming their software stack",
    message:
      "Hi [name], do UI tickets ever wait for design capacity before a release? I am exploring Greensighter's fit for that workflow. If this is relevant, would you discuss a recent design handoff?",
    alternative:
      "Ads require confirmed budget, acquisition economics and a conversion path; webinars require production time and distribution. Revisit after conversations establish demand.",
  },
  {
    name: "FirstCustomers",
    url: "https://www.firstcustomers.app/",
    audience: "Early-stage SaaS founders",
    summary:
      "FirstCustomers helps SaaS founders acquire their first customers through website analysis, ideal customer profiles, sales messaging, acquisition experiments and 30-day action plans.",
    problem:
      "Choosing an achievable first acquisition experiment without a sales team",
    buyers: [
      "Bootstrapped SaaS founder",
      "Technical founder entering sales",
      "Accelerator programme director",
    ],
    pains: [
      "Competing acquisition advice makes the first test unclear",
      "Technical work crowds out buyer conversations",
      "Cohort founders need practical acquisition plans",
    ],
    channels: [
      "Founder community problem discussion",
      "Founder peer introductions",
      "Accelerator partnership discovery",
    ],
    action:
      "Check one accessible founder group's rules and invite three consenting founders to discuss choosing a first sales experiment",
    message:
      "Hi [name], what is making your first SaaS acquisition experiment difficult to choose? I am exploring FirstCustomers with founders facing that decision. Would you share which options you are weighing and why?",
    alternative:
      "Accelerator partnerships could be preferable with programme access, but institutional buying and cohort timing make them slower without relationships.",
  },
  {
    name: "ShiftRoster",
    url: "https://shiftroster.example/",
    audience: "Independent cafe owners",
    summary:
      "ShiftRoster provides weekly staff scheduling and shift-swap requests for independent cafes.",
    problem: "Last-minute staff shift changes disrupt cafe cover",
    buyers: [
      "Single-site cafe owner",
      "Small cafe group operations manager",
      "Hospitality bookkeeper advising cafes",
    ],
    pains: [
      "Shift swaps in chat leave cover unclear",
      "Staff allocation across sites is hard to coordinate",
      "Clients send inconsistent roster records",
    ],
    channels: [
      "Local coffee-roaster partner introduction",
      "Cafe association listing",
      "Owner peer-group discussion",
    ],
    action:
      "Ask one local coffee roaster whether cafe clients raise rota problems and whether a voluntary introduction is appropriate",
    message:
      "Hi [name], do cafe owners ever ask you about managing last-minute staff cover? I am exploring ShiftRoster's fit for independent cafes. Would discussing the problem be useful before considering any introductions?",
    alternative:
      "A cafe association listing is reversible but depends on relevant traffic; a roaster conversation first tests access to owners and real urgency.",
  },
];

const inferred = (text: string) => ({
  text,
  confidence: "Inferred" as const,
  sources: [],
});
export function commercialFixture(c = commercialCases[0]) {
  const f = siteFixture({
    ...c,
    demoName: "ExampleAnalytics",
    demo: "ExampleAnalytics diagnoses trial onboarding funnels.",
    markup: 'data-content-kind="illustrative"',
  });
  const r = f.report;
  r.industries = [
    inferred(
      c.name === "ShiftRoster"
        ? "Independent cafes and hospitality"
        : c.name === "Senja"
          ? "Online education, marketing services and B2B software"
          : "Software product teams",
    ),
  ];
  r.segments = r.segments.map((s, i) => ({
    ...s,
    industry: r.industries[0].text,
    name: c.buyers[i],
    buyerRoles: [c.buyers[i]],
    customerType: [
      "Owner-managed operator",
      "Client-services business",
      "Managed team or institution",
    ][i],
    problems: [c.pains[i]],
    motivations: [
      `Resolve ${c.pains[i].toLowerCase()} before committing more resources`,
    ],
    evidence: inferred(
      i === 0
        ? `Hypothesis: direct role access and simpler buying favour this buyer. Confirm urgency in three conversations. ${c.alternative}`
        : `Hypothesis: ${c.buyers[i]} may buy for this problem; access, authority and willingness to pay remain unknown. Validate a recent example first.`,
    ),
  }));
  r.idealCustomers = c.buyers.map(inferred);
  r.buyerPersonas = c.buyers.map(inferred);
  r.valueProposition = inferred(
    `Test whether ${c.audience} value resolving ${c.problem.toLowerCase()}; confirm urgency and willingness to pay in conversations.`,
  );
  r.differentiators = [
    inferred(
      "Test the proposed workflow against the buyer's current alternative; comparative advantage has not been established.",
    ),
  ];
  r.positioning = inferred(
    `For ${c.audience}, test the pain of ${c.problem.toLowerCase()}. ${c.alternative}`,
  );
  r.missingInformation = [
    {
      text: "Founder budget, weekly time, customer traction, current channels and audience access are unknown; existing relationships could change ranking and timing.",
      confidence: "Unknown",
      sources: [],
    },
  ];
  r.acquisitionChannels = c.channels.map((channel, i) => ({
    title: channel,
    recommendation: inferred(
      `${i === 0 ? "Start" : "Conditional alternative"}: ${c.buyers[i]}; test urgency before a purchase request. Assume no spend and one hour for this small test, pending founder confirmation.`,
    ),
    steps: [
      i === 0
        ? c.action
        : `Check access to one ${c.buyers[i]} through ${channel.toLowerCase()} before committing effort`,
      "Log at most three invitations as an activity limit, not a reply forecast; record replies, urgency, buying authority and next-step permission",
    ],
    successMetric:
      "Count qualified conversations. Continue only if someone confirms urgent pain and a next step; otherwise change the pain or stop this batch.",
  }));
  r.outreachTemplates = [0, 1].map((i) => ({
    channel: c.channels[0],
    subject: i
      ? "Following up with permission"
      : `Question about ${c.problem.toLowerCase()}`,
    body: i
      ? `Hi [name], would you like to continue our discussion about [problem you confirmed]? If this is no longer a priority, I will close the loop. Is there a useful next step?`
      : c.message,
    rationale: inferred(
      i
        ? "Use only after an actual response and permission to follow up; retain the buyer's own wording."
        : `A question about ${c.problem.toLowerCase()} tests urgency without inventing prospect research.`,
    ),
  }));
  r.firstTenPlaybook = [
    "Establish urgent pain",
    "Offer a scoped paid test",
    "Repeat after evidence",
  ].map((title, i) => ({
    title,
    recommendation: inferred(
      [
        "Begin with the selected buyer and channel; payments remain an uncertain outcome.",
        "If a buyer confirms urgency, agree a scoped next step and buying terms before delivery.",
        "If the test produces useful conversations and confirmed payments, repeat a small batch; otherwise revise the hypothesis.",
      ][i],
    ),
    steps: [
      i
        ? "Review the evidence log from the previous batch before committing more effort"
        : c.action,
      "Count confirmed payments separately from invitations, replies and free trials",
    ],
    successMetric:
      "Record objections and confirmed payments; continue only after a concrete buying next step, otherwise change the offer or stop.",
  }));
  r.thirtyDayPlan = r.thirtyDayPlan.map((w, i) => ({
    ...w,
    objective: [
      "Prepare the initial small test",
      "Review actual buyer responses",
      "Test a buying next step conditionally",
      "Decide whether to repeat",
    ][i],
    actions: [
      i === 0
        ? c.action
        : `Review week ${i} evidence from ${c.channels[0]}; if no urgency is confirmed, revise the pain before more invitations`,
      i === 0
        ? "Set a three-invitation activity cap; assume one hour and no spend pending founder context"
        : "If a buyer confirms urgency and permission, arrange one next step; otherwise close the loop",
    ],
    successMetric:
      "Record invitations, qualified conversations and confirmed payments separately; document whether to continue, modify or stop.",
    rationale: inferred(
      [
        "Preparation and small scope test buyer access before investing in distribution.",
        "Observed replies determine whether the chosen pain deserves another batch.",
        "Buying steps depend on explicit urgency rather than an assumed conversion rate.",
        "Repeat only if evidence supports the buyer, message and commercial next step.",
      ][i],
    ),
  }));
  return {
    ...f,
    report: reportV11Schema.parse({
      ...groundReport(r, f.profile, true),
      schemaVersion: "1.1",
      productIntelligence: f.profile,
      recommendationBasis: f.basis,
      firstExperiment: experimentFor(r),
    }),
  };
}
