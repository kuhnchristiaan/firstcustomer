import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
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
const password = randomBytes(30).toString("base64url");
const email = `firstcustomers-smoke-${suffix}@example.com`;
let productId;
try {
  const check = await pool.query(
    "SELECT current_database() AS database, to_regclass('public.\"Product\"') AS product_table",
  );
  assert.equal(check.rows[0].database, "neondb");
  assert.ok(check.rows[0].product_table);
  passed("live_postgres_and_migrations");
  const anonymous = new BrowserSession();
  const denied = await anonymous.request("/api/analyses", {
    method: "POST",
    body: JSON.stringify({ url: "https://plausible.io/" }),
  });
  expectStatus(denied, 401, "Unauthenticated analysis");
  passed("unauthenticated_api_denied");
  const a = new BrowserSession();
  const signup = await a.request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      name: "FirstCustomers acceptance test",
      email,
      password,
    }),
  });
  expectStatus(signup, 200, "Signup");
  assert.ok(signup.body?.user?.id);
  passed("neon_auth_signup");
  const firstId = signup.body.user.id;
  const session = await a.request("/api/auth/get-session");
  expectStatus(session, 200, "Session");
  assert.equal(session.body?.user?.id, firstId);
  passed("session_restoration");
  const dashboard = await a.request("/dashboard");
  expectStatus(dashboard, 200, "Dashboard");
  assert.ok(dashboard.text.includes("From product to first customers"));
  passed("authenticated_dashboard_and_organization");
  const org = await pool.query(
    'SELECT id FROM "Organization" WHERE "ownerId"=$1',
    [firstId],
  );
  assert.equal(org.rowCount, 1);
  const started = Date.now();
  const generated = await a.request("/api/analyses", {
    method: "POST",
    body: JSON.stringify({ url: "https://plausible.io/" }),
  });
  expectStatus(generated, 200, "Live report generation");
  productId = generated.body.productId;
  const run = await pool.query(
    'SELECT a.* FROM "AnalysisRun" a JOIN "Product" p ON p.id=a."productId" WHERE p.id=$1 AND p."organizationId"=$2 ORDER BY a."startedAt" DESC LIMIT 1',
    [productId, org.rows[0].id],
  );
  assert.equal(run.rows[0].status, "SUCCEEDED");
  assert.equal(run.rows[0].provider, "openai");
  assert.ok(run.rows[0].inputTokens > 0);
  assert.equal(run.rows[0].output.segments.length, 3);
  passed("authenticated_live_report_generation", {
    seconds: Math.round((Date.now() - started) / 1000),
    inputTokens: run.rows[0].inputTokens,
    outputTokens: run.rows[0].outputTokens,
  });
  const report = run.rows[0].output;
  report.positioning.text +=
    " Founder-reviewed during service acceptance testing.";
  const approved = await a.request(`/api/products/${productId}/profile`, {
    method: "POST",
    body: JSON.stringify({
      analysisId: run.rows[0].id,
      report,
      expectedVersion: 0,
    }),
  });
  expectStatus(approved, 200, "Profile approval");
  assert.equal(approved.body.version, 1);
  const saved = await pool.query(
    'SELECT findings FROM "ProductProfile" WHERE "productId"=$1 AND version=1',
    [productId],
  );
  assert.deepEqual(saved.rows[0].findings, report);
  passed("edited_profile_saved_in_neon");
  const logout = await a.request("/api/auth/sign-out", {
    method: "POST",
    body: "{}",
  });
  expectStatus(logout, 200, "Logout");
  const afterLogout = await a.request("/api/auth/get-session");
  assert.ok(!afterLogout.body?.user);
  passed("signout_clears_session");
  const login = await a.request("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  expectStatus(login, 200, "Login");
  const restored = await a.request(`/products/${productId}`);
  expectStatus(restored, 200, "Saved report");
  assert.ok(
    restored.text.includes(
      "Founder-reviewed during service acceptance testing.",
    ),
  );
  passed("signin_and_persistent_report_reload");
  const b = new BrowserSession();
  const second = await b.request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      name: "Second isolated acceptance tenant",
      email: `firstcustomers-other-${suffix}@example.com`,
      password: randomBytes(30).toString("base64url"),
    }),
  });
  expectStatus(second, 200, "Second signup");
  expectStatus(
    await b.request(`/products/${productId}`),
    404,
    "Cross-tenant report read",
  );
  expectStatus(
    await b.request(`/api/products/${productId}/profile`, {
      method: "POST",
      body: JSON.stringify({
        analysisId: run.rows[0].id,
        report,
        expectedVersion: 1,
      }),
    }),
    404,
    "Cross-tenant approval",
  );
  passed("cross_tenant_read_and_write_denied");
  const sources = await pool.query(
    'SELECT count(*)::int AS total FROM "WebsiteSource" WHERE "analysisId"=$1',
    [run.rows[0].id],
  );
  assert.ok(sources.rows[0].total > 0);
  passed("website_evidence_persisted", { pages: sources.rows[0].total });
  await mkdir(".local-live-test", { recursive: true });
  await writeFile(
    ".local-live-test/neon-acceptance.json",
    JSON.stringify(
      {
        projectId: "misty-bar-85645678",
        branchId: process.env.NEON_BRANCH,
        productId,
        outcomes,
      },
      null,
      2,
    ),
  );
  passed("all_neon_acceptance_checks");
} catch (error) {
  console.error(
    JSON.stringify({
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown test error",
      completedChecks: outcomes.length,
    }),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
