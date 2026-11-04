import type { Report } from "@/modules/intelligence/schema";
import {
  validateStrategy,
  weeklyAllowance,
  type FounderContext,
} from "./schema";
// Deterministic development fixture; never used in production.
export function mockStrategy(r: Report, c: FounderContext) {
  const cap = weeklyAllowance(c),
    established = c.payingCustomers === "More than 200",
    lean = cap < 60 || c.monthlyBudget === 0;
  const provenChannels = c.channels?.some(
    (x) =>
      x === "Partnerships or referrals" || x === "SEO or content marketing",
  );
  const channel =
    established || provenChannels
      ? "Customer referral experiment"
      : lean
        ? "One focused problem interview"
        : "Founder-led targeted outreach";
  const complex = /enterprise|procurement|complex integration/i.test(
    JSON.stringify([r.overview, r.segments]),
  );
  const ranked =
    complex && r.segments.length === 3
      ? [r.segments[1], r.segments[0], r.segments[2]].map((s, i) => ({
          ...s,
          priority: i + 1,
        }))
      : r.segments;
  const segment = ranked[0].name,
    minutes = Math.max(1, Math.floor(cap / 3));
  return validateStrategy(
    {
      schemaVersion: "2.0",
      executiveSummary: `${r.businessName}: test ${channel.toLowerCase()} with ${segment}. ${lean ? "Time and budget allow a small learning experiment, not a predictable pipeline." : established ? "Use the installed paying base to investigate repeatable acquisition." : "Use existing traction to test a repeatable sales conversation."}`,
      changesFromPrevious: [
        `Prioritize ${channel} over broad publishing or advertising because the founder has ${cap} minutes weekly.`,
        "Retain original website facts; no new research was performed.",
      ],
      firstMove: {
        segment,
        why: `Test the pain described in the original analysis of ${r.businessName}.`,
        where:
          c.existingAudience === "None"
            ? "Manually verify a public buyer role; no existing audience is assumed"
            : established
              ? "Your own consenting paying customer contacts"
              : "Your own professional network; manually verify role and fit",
        action: established
          ? "Ask one satisfied customer what triggered their purchase and whether a peer has the same problem"
          : "Invite one person matching the segment to a short problem interview",
        minutes,
        message: `Hi [name], I am testing whether ${r.businessName} addresses your workflow.\nWhat happens today when [problem]? No purchase expected.`,
        continueWhen:
          "One relevant conversation confirms an urgent problem and a concrete next step",
        changeWhen:
          "After the small batch, no one confirms the problem or agrees to a next step",
      },
      prioritizedSegments: ranked.map((s) => ({
        name: s.name,
        priority: s.priority,
        rationale: s.evidence.text,
      })),
      positioning: r.positioning.text,
      channels: [
        {
          name: channel,
          priority: 1,
          rationale: `Fits ${r.businessName}'s ${segment} hypothesis and ${cap}-minute constraint.`,
          segment,
          weeklyMinutes: minutes,
          monthlyDirectCost: 0,
          costCurrency: c.currency ?? "USD",
          timeHorizonAssumption:
            "Review after four weeks; timing is a planning assumption",
          risks: "Access and willingness to pay are unvalidated",
          evidenceLevel: "Inferred — unvalidated experiment",
          firstAction: "Choose one manually verified contact",
        },
        {
          name: established
            ? "Partner discovery"
            : "Permission-based referrals",
          priority: 2,
          rationale: established
            ? "Explore partners only after customer evidence identifies an overlapping audience"
            : "Ask a relevant contact for an introduction only after confirming the problem",
          segment,
          weeklyMinutes: minutes,
          monthlyDirectCost: 0,
          costCurrency: c.currency ?? "USD",
          timeHorizonAssumption:
            "Consider only after the first conversation; no guarantee",
          risks: "No confirmed referral or partner availability",
          evidenceLevel: "Inferred — unvalidated experiment",
          firstAction: "Ask whether they know a person facing this problem",
        },
      ],
      whyTopChannel: `${channel} permits a measurable conversation within the available time, unlike daily content or an unvalidated ad campaign.`,
      firstTen: {
        segment,
        experiment: channel,
        batchPlanningTarget: Math.max(
          1,
          Math.min(Math.floor(cap / 5), lean ? 2 : established ? 10 : 5),
        ),
        targetDisclaimer: "Experimental planning target, not a forecast",
        stages: [
          "Prospects identified",
          "Prospects contacted",
          "Qualified conversations",
          "Trial / demo if relevant",
          "Paying customers",
        ],
        qualificationQuestions: [
          "How do you solve this today?",
          "Who authorizes payment and what would justify a purchase?",
        ],
        objections: ["No urgency: ask what would make solving this worthwhile"],
        followUp:
          "Ask permission for one follow-up next week; stop when declined",
        changeCriteria:
          "Revise segment or pain hypothesis if the batch yields no qualified conversation",
        paymentDefinition:
          "A free signup or trial is not a paying customer; count only confirmed payment.",
      },
      weeks: [1, 2, 3, 4].map((week) => ({
        week,
        objective: [
          "Validate pain",
          "Test the message",
          "Explore a buying next step",
          "Review evidence and decide",
        ][week - 1],
        actions: [
          {
            action:
              week === 1
                ? `Identify ${lean ? 2 : 5} manually checked ${segment} contacts`
                : `Follow up with permission about ${r.businessName}`,
            minutes,
          },
          {
            action:
              "Record pain, buying authority, next step and confirmed payments separately",
            minutes,
          },
        ],
        deliverable: "A short evidence log, not an automated prospect list",
        successMetric:
          "Count qualified conversations and confirmed payments separately",
        nextDecision:
          "Continue only with confirmed pain and a specific next step; otherwise narrow the segment",
      })),
      messages: [
        {
          channel,
          subject: `Question about your ${r.businessName} workflow`,
          body: "Hi [name],\nHow do you handle [specific problem] today? Would a short conversation be useful?",
        },
        {
          channel: "Follow-up",
          subject: "Permission to follow up",
          body: "Hi [name],\nWould you like to explore a next step? If this is not a priority, I will close the loop.",
        },
      ],
      assumptions: [
        "All channels are unvalidated hypotheses; no market research was performed",
        ...(!c.weeklyTime && !c.weeklyMinutes
          ? ["Assume 60 minutes weekly until confirmed"]
          : []),
        "No direct spend committed; tool and platform costs require validation",
      ],
      validationQuestions: [
        "Does this segment experience an urgent problem?",
        "What would justify paying, and who approves payment?",
      ],
    },
    c,
  );
}
