// Test-only loopback upstreams. Application authentication is not bypassed.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const read = async (p) =>
  JSON.parse(
    await readFile(
      new URL(`../docs/strategy-intelligence-proof/${p}`, import.meta.url),
      "utf8",
    ),
  );
const profiles = {
  senja: await read("evidence/senja-profile.json"),
  tally: await read("evidence/tally-profile.json"),
};
const sources = {
  senja: await read("evidence/senja-sources.json"),
  tally: await read("evidence/tally-sources.json"),
};
const strategies = {
  senja: await read("run-1/senja-output.txt"),
  tally: await read("run-1/tally-output.txt"),
};
const sessions = new Map();
let aiCalls = 0;
function send(res, value, status = 200, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(value));
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:3103");
    if (url.pathname === "/health")
      return send(res, {
        fixture: true,
        aiCalls,
        authOnly: process.env.ADVISOR_AUTH_ONLY === "true",
      });
    if (url.pathname === "/sources") {
      if (process.env.ADVISOR_AUTH_ONLY === "true")
        return send(
          res,
          { error: "Source fixtures disabled for live smoke" },
          403,
        );
      const host = new URL(url.searchParams.get("url")).hostname;
      const slug =
        host === "senja.io" ? "senja" : host === "tally.so" ? "tally" : null;
      return slug
        ? send(res, sources[slug])
        : send(res, { error: "Unknown fixture URL" }, 400);
    }
    if (url.pathname.startsWith("/auth/")) {
      if (url.pathname.endsWith("/sign-in/email")) {
        const body = await bodyJson(req);
        if (
          ![
            "alice@example.test",
            "bob@example.test",
            "smoke@example.test",
          ].includes(body.email) ||
          body.password !== "fixture-password-123"
        )
          return send(
            res,
            {
              code: "INVALID_CREDENTIALS",
              message: "Use a documented fixture account.",
            },
            401,
          );
        const id = body.email.startsWith("smoke")
          ? "local-live-smoke-founder"
          : body.email.startsWith("alice")
            ? "fixture-alice"
            : "fixture-bob";
        const token = `fixture-token-${id}`;
        sessions.set(token, {
          user: {
            id,
            email: body.email,
            name:
              id === "local-live-smoke-founder"
                ? "Smoke Founder"
                : id === "fixture-alice"
                  ? "Alice Founder"
                  : "Bob Founder",
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          session: {
            id: `session-${id}`,
            token,
            userId: id,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        return send(
          res,
          { token, user: sessions.get(token).user, redirect: false },
          200,
          {
            "Set-Cookie": `__Secure-neon-auth.session_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
          },
        );
      }
      const token = /__Secure-neon-auth\.session_token=([^;]+)/.exec(
        req.headers.cookie ?? "",
      )?.[1];
      if (url.pathname.endsWith("/sign-out")) {
        sessions.delete(token);
        return send(res, { success: true }, 200, {
          "Set-Cookie":
            "__Secure-neon-auth.session_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
        });
      }
      return send(res, sessions.get(token) ?? null);
    }
    if (url.pathname === "/v1/responses") {
      if (process.env.ADVISOR_AUTH_ONLY === "true")
        return send(res, { error: "AI fixtures disabled for live smoke" }, 403);
      const request = await bodyJson(req);
      aiCalls++;
      const data = JSON.parse(request.input[1].content);
      const format = request.text.format.name;
      const slug = JSON.stringify(data).includes("Tally") ? "tally" : "senja";
      let output;
      if (format === "advisor_product_identification") {
        const p = profiles[slug];
        output = {
          ...p,
          identity: {
            ...p.identity,
            evidence: p.identity.evidence.map(({ blockId }) => ({ blockId })),
          },
          statements: p.statements.map((s) => ({
            ...s,
            text:
              slug === "tally" && s.id === "s4"
                ? "Tally says it is hosted in Europe and encrypts form data in transit and at rest."
                : s.text,
            evidence: s.evidence.map(({ blockId }) => ({ blockId })),
          })),
        };
      } else if (format === "advisor_strategy") {
        output = structuredClone(strategies[slug]);
        output.schemaVersion = "advisor/1";
        const available =
          data.founderContext.resources.hoursPerWeek === null
            ? 60
            : Math.floor(data.founderContext.resources.hoursPerWeek * 60);
        const titles = [
          "Verify the actual SaaS offer",
          "Check access to suitable buyers",
          "Prepare a small, relevant introduction",
          "Help interested buyers take a useful step",
          "Review what you learned",
        ];
        output.tasks = output.tasks.map((t, i) => ({
          ...t,
          title: titles[i],
          minutes: Math.floor(([20, 30, 35, 35, 20][i] * available) / 180),
        }));
        output.resources = {
          availableMinutes: available,
          experimentBudget: 0,
          currency:
            data.founderContext.resources.monthlyBudget?.currency ?? "USD",
          basis: `Local transport fixture adapted from the approved Stage 2A example. ${data.founderContext.resources.hoursPerWeek === null ? "Weekly time was skipped; 60 available minutes is a provisional assumption." : "Available weekly time comes from the saved founder answers."} ${data.founderContext.resources.monthlyBudget === null ? "Budget was skipped; zero direct spend is an assumption." : "The saved acquisition budget is respected."} Unallocated time is reserved for interruptions and follow-up.`,
        };
        output.channel.accessCheck =
          slug === "senja"
            ? "Before writing messages, find three course owners with a recent completed cohort, an upcoming enrollment page and a permitted free contact route. Save the evidence links."
            : "Before building an example, check current subreddit rules and find three recent agency-owner requests about a live form project. Verify that helpful, disclosed replies are permitted.";
        output.channel.fallback =
          slug === "senja"
            ? "If free LinkedIn contact is unavailable, inspect those same owners’ public course sites for a business inquiry route that permits relevant introductions. If neither route is available, pause contact and record the access barrier."
            : "If there are no eligible permitted threads, inspect the same agencies’ public project-help requests in a web-design community that permits disclosed recommendations. Verify relevance and permission before posting; otherwise pause promotion.";
      } else if (format === "advisor_weekly_review") {
        const current = data.currentPlan;
        const results = data.results;
        const blocked = /access unavailable|no permitted|blocked/i.test(
          results.feedback,
        );
        const adjust =
          !blocked &&
          (results.qualifiedConversations > 0 ||
            /objection|pricing|friction/i.test(results.feedback));
        const proposedPlan = structuredClone(current);
        const decision = blocked
          ? "Reconsider"
          : adjust
            ? "Adjust"
            : "Continue";
        if (blocked) {
          proposedPlan.channel = {
            ...current.channel,
            name: "Permission-based public business inquiries",
            whereAndHow:
              "Find the same buyer on public business sites and use an explicitly permitted inquiry route.",
            whyChosen:
              "Reported channel access was blocked; test a verified free business contact route for the same buyer.",
          };
        }
        const title = blocked
          ? "Verify a permitted free contact route"
          : adjust
            ? "Address the reported objection"
            : "Build on the completed preparation";
        const instruction = blocked
          ? "Check public business inquiry permissions for the same buyer before contacting anyone. Pause if no permitted route exists."
          : adjust
            ? "Use the recorded feedback to clarify the actual paid SaaS offer and address the objection without inventing pricing or paid features."
            : "Use the existing preparation to run a small relevant test; do not repeat already completed setup work.";
        const cap = Math.floor(current.resources.availableMinutes * 0.8);
        proposedPlan.tasks = [
          {
            title,
            instruction,
            activityToRecord:
              "Record the observed access condition or objection and the action taken.",
            minutes: Math.floor(cap / 3),
            directCost: 0,
          },
          {
            title: "Follow up on qualified interest",
            instruction:
              "Follow up only where permission and relevance are confirmed. Help the buyer take one useful step in the actual SaaS.",
            activityToRecord:
              "Record replies, qualified conversations, activation and confirmed payment separately.",
            minutes: Math.floor(cap / 3),
            directCost: 0,
          },
          {
            title: "Compare evidence with this week's results",
            instruction:
              "Review the next observations against the reported baseline and note what remains unknown. Do not infer sales from completed tasks.",
            activityToRecord:
              "Record actual outcomes and unresolved uncertainties.",
            minutes: Math.floor(cap / 3),
            directCost: 0,
          },
        ];
        output = {
          decision,
          evidenceAssessment: `Local review fixture: ${results.prospectsContacted ?? "unknown"} prospects contacted, ${results.replies ?? "unknown"} replies, ${results.qualifiedConversations ?? "unknown"} qualified conversations, ${results.activations ?? "unknown"} activations, ${results.payingCustomers ?? "unknown"} paying customers. Completed tasks are activity only. Feedback: ${results.feedback || "None supplied."}`,
          remainingUncertainty:
            "A single week and incomplete exposure do not establish demand or its absence. Unknown metrics remain unknown.",
          changeReason: blocked
            ? "Reported access barriers justify proposing another permitted route for the same buyer; this requires explicit approval."
            : adjust
              ? "Reported qualified interest and objections justify refining execution while keeping the buyer and channel."
              : "The available evidence supports another scoped test, preserving the buyer and channel rather than changing strategy because a week passed.",
          proposedPlan,
        };
      } else {
        const selected = data.selectedTaskPosition;
        output = {
          answer:
            selected === null
              ? "Local AI transport fixture: this plan prioritizes a buyer with a visible trigger and purchasing authority. Validate free channel access before preparing outreach. The saved product evidence supports the core capability, but does not establish demand or a paid-feature boundary. Track actual buying interest separately from completed activities. Your saved buyer, channel and tasks have not changed."
              : `Local AI transport fixture for task ${selected + 1}: open the task instructions and keep within its time allowance. Save a source link for each observation, confirm the buyer fits the stated segment, and check permission before contacting anyone. If access fails, use the conditional fallback only after verifying it. Record what you actually did; do not mark a conversation or payment merely because the task is complete.`,
        };
      }
      return send(res, {
        id: `resp_fixture_${aiCalls}`,
        object: "response",
        created_at: Math.floor(Date.now() / 1000),
        status: "completed",
        model: request.model,
        service_tier: "default",
        error: null,
        incomplete_details: null,
        output: [
          {
            id: `msg_fixture_${aiCalls}`,
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: JSON.stringify(output),
                annotations: [],
              },
            ],
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 100,
          total_tokens: 200,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens_details: { reasoning_tokens: 0 },
        },
      });
    }
    send(res, { error: "Not found" }, 404);
  } catch {
    send(res, { error: "Fixture request failed" }, 500);
  }
});
async function bodyJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || "{}");
}
server.listen(3103, "127.0.0.1", () =>
  console.info(
    "Local auth/AI/source fixtures listening on 127.0.0.1:3103. No remote provider access.",
  ),
);
