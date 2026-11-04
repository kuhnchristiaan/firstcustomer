import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
const base = new URL(process.env.APP_URL || "http://localhost:3000").origin;
assert.equal(
  base,
  "http://localhost:3000",
  "Smoke test is restricted to the local app",
);
assert.equal(
  JSON.parse(await readFile(".neon", "utf8")).projectId,
  "misty-bar-85645678",
  "Use only FirstCustomers",
);
assert.ok(
  ["production", "br-odd-cake-ba4pc9g8"].includes(process.env.NEON_BRANCH),
  "Use only the linked FirstCustomers branch",
);
assert.ok(
  new URL(process.env.DATABASE_URL).hostname.startsWith(
    "ep-raspy-hill-bafh7gu5",
  ),
  "Unexpected database endpoint",
);
assert.equal(
  process.env.MOCK_ANALYSIS,
  "false",
  "This acceptance test uses live analysis",
);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});
const outcomes = [];
const passed = (check, details = {}) => {
  outcomes.push({ check, status: "passed", ...details });
  console.log(JSON.stringify(outcomes.at(-1)));
};
class BrowserSession {
  cookies = new Map();
  async request(path, options = {}) {
    const response = await fetch(base + path, {
      ...options,
      redirect: "manual",
      headers: {
        Origin: base,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...options.headers,
      },
    });
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";")[0];
      const split = pair.indexOf("=");
      const key = pair.slice(0, split);
      const value = pair.slice(split + 1);
      if (!value || /max-age=0(?:;|$)/i.test(header)) this.cookies.delete(key);
      else this.cookies.set(key, value);
    }
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return { response, text, body };
  }
}
const expectStatus = (result, status, label) =>
  assert.equal(
    result.response.status,
    status,
    `${label}: HTTP ${result.response.status}; ${result.body?.error || result.body?.message || ""}`,
  );
const suffix = randomUUID();
const email = `guest-claim-${suffix}@example.com`;
const password = randomBytes(30).toString("base64url");
const guest = new BrowserSession();
try {
  expectStatus(await guest.request("/api/guest/report"), 404, "No guest token");
  passed("guest_report_private_without_token");
  const session = await guest.request("/api/guest/session", { method: "POST" });
  expectStatus(session, 200, "Guest session");
  assert.ok(
    session.response.headers
      .getSetCookie()
      .some(
        (c) =>
          c.startsWith("fc_guest=") &&
          /httponly/i.test(c) &&
          /samesite=lax/i.test(c),
      ),
  );
  assert.ok(!session.body.token);
  passed("httponly_guest_cookie_issued");
  expectStatus(
    await guest.request("/api/guest/analyses", {
      method: "POST",
      body: JSON.stringify({ url: "https://plausible.io/" }),
    }),
    400,
    "Missing Turnstile",
  );
  passed("missing_turnstile_rejected");
  const started = Date.now();
  expectStatus(
    await guest.request("/api/guest/analyses", {
      method: "POST",
      body: JSON.stringify({
        url: "https://plausible.io/",
        turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
      }),
    }),
    200,
    "Guest generation",
  );
  const read = await guest.request("/api/guest/report");
  expectStatus(read, 200, "Guest report");
  assert.equal(read.body.status, "SUCCEEDED");
  const report = read.body.output;
  for (const key of [
    "overview",
    "idealCustomers",
    "segments",
    "positioning",
    "acquisitionChannels",
    "outreachTemplates",
    "firstTenPlaybook",
    "thirtyDayPlan",
    "missingInformation",
  ])
    assert.ok(report[key]);
  assert.equal(report.idealCustomers.length, 3);
  assert.equal(report.thirtyDayPlan.length, 4);
  const hash = createHash("sha256")
    .update(guest.cookies.get("fc_guest"))
    .digest("hex");
  const rows = await pool.query(
    'SELECT a.*,g.id AS guest_id FROM "AnalysisRun" a JOIN "GuestAnalysisSession" g ON a."guestSessionId"=g.id WHERE g."tokenHash"=$1 ORDER BY a."startedAt" DESC',
    [hash],
  );
  assert.equal(rows.rowCount, 1);
  const run = rows.rows[0];
  assert.equal(run.productId, null);
  assert.equal(run.provider, "openai");
  assert.ok(run.inputTokens > 0);
  assert.ok(Number(run.estimatedCost) > 0);
  assert.ok(
    Number(run.estimatedCost) <= Number(process.env.GUEST_MAX_COST_USD),
  );
  passed("full_live_report_without_authentication", {
    seconds: Math.round((Date.now() - started) / 1000),
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    estimatedCost: run.estimatedCost,
  });
  const stranger = new BrowserSession();
  expectStatus(
    await stranger.request(`/api/guest/report?id=${run.id}`),
    404,
    "Guessed run ID",
  );
  passed("guest_idor_denied");
  expectStatus(
    await guest.request("/api/guest/claim", { method: "POST", body: "{}" }),
    401,
    "Anonymous claim",
  );
  passed("claim_requires_authentication");
  for (const event of [
    "landing_visit",
    "url_submission",
    "report_view",
    "save_strategy_click",
    "registration_start",
  ])
    expectStatus(
      await guest.request("/api/funnel", {
        method: "POST",
        body: JSON.stringify({ event }),
      }),
      204,
      "Funnel event",
    );
  const signup = await guest.request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      name: "Guest strategy claim acceptance",
      email,
      password,
    }),
  });
  expectStatus(signup, 200, "Signup");
  assert.ok(signup.body.user.id);
  passed("registration_after_complete_report");
  const otherBrowser = new BrowserSession();
  for (const [key, value] of guest.cookies)
    if (key !== "fc_guest") otherBrowser.cookies.set(key, value);
  expectStatus(
    await otherBrowser.request("/api/guest/claim", {
      method: "POST",
      body: "{}",
    }),
    404,
    "Claim without original browser token",
  );
  passed("account_without_guest_token_cannot_claim");
  const claims = await Promise.all([
    guest.request("/api/guest/claim", { method: "POST", body: "{}" }),
    guest.request("/api/guest/claim", { method: "POST", body: "{}" }),
  ]);
  claims.forEach((r) => expectStatus(r, 200, "Claim"));
  assert.deepEqual(claims[0].body, claims[1].body);
  const { productId, analysisId } = claims[0].body;
  assert.equal(analysisId, run.id);
  const transferred = await pool.query(
    'SELECT output,"productId" FROM "AnalysisRun" WHERE id=$1',
    [run.id],
  );
  assert.deepEqual(transferred.rows[0].output, report);
  assert.equal(transferred.rows[0].productId, productId);
  assert.equal(
    (
      await pool.query(
        'SELECT count(*)::int AS total FROM "AnalysisRun" WHERE "guestSessionId"=$1',
        [run.guest_id],
      )
    ).rows[0].total,
    1,
  );
  passed("atomic_idempotent_claim_without_regeneration");
  expectStatus(
    await guest.request("/api/guest/report"),
    404,
    "Claimed report no longer guest-readable",
  );
  expectStatus(
    await guest.request(`/products/${productId}?run=${analysisId}`),
    200,
    "Saved report",
  );
  const edited = structuredClone(report);
  edited.positioning.text += " Guest strategy reviewed after signup.";
  expectStatus(
    await guest.request(`/api/products/${productId}/profile`, {
      method: "POST",
      body: JSON.stringify({ analysisId, report: edited, expectedVersion: 0 }),
    }),
    200,
    "Edit and approve",
  );
  passed("claimed_strategy_editable_and_saved");
  expectStatus(
    await guest.request("/api/auth/sign-out", { method: "POST", body: "{}" }),
    200,
    "Signout",
  );
  expectStatus(
    await guest.request("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
    200,
    "Signin",
  );
  const restored = await guest.request(`/products/${productId}`);
  expectStatus(restored, 200, "Persistent report");
  assert.ok(restored.text.includes("Guest strategy reviewed after signup."));
  passed("saved_guest_strategy_survives_later_signin");
  expectStatus(
    await stranger.request("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "Isolated replay test",
        email: `guest-other-${suffix}@example.com`,
        password: randomBytes(30).toString("base64url"),
      }),
    }),
    200,
    "Other tenant signup",
  );
  stranger.cookies.set("fc_guest", guest.cookies.get("fc_guest"));
  expectStatus(
    await stranger.request("/api/guest/claim", { method: "POST", body: "{}" }),
    404,
    "Cross-tenant replay",
  );
  expectStatus(
    await stranger.request(`/products/${productId}`),
    404,
    "Cross-tenant report",
  );
  passed("cross_tenant_replay_and_report_access_denied");
  await mkdir(".local-live-test", { recursive: true });
  await writeFile(
    ".local-live-test/guest-acceptance.json",
    JSON.stringify(
      { projectId: "misty-bar-85645678", productId, analysisId, outcomes },
      null,
      2,
    ),
  );
  passed("all_guest_acceptance_checks");
} catch (error) {
  console.error(
    JSON.stringify({
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown error",
      completedChecks: outcomes.length,
    }),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
