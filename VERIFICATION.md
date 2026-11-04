# Verification — 4 November 2026

## Guest report flow — completed locally

The full report is now generated before account registration. The additive guest migration applied to both the isolated local PostgreSQL test cluster and the existing FirstCustomers Neon database; no existing reports were deleted. No domain, Vercel deployment or new paid service was created. Localhost uses Cloudflare's official test keys, which the production runtime rejects.

Final automated suite: **87 tests passed, one optional paid standalone report test skipped** across 11 files. This run included real isolated PostgreSQL tests, a real public HTML fetch, and unit/component tests. It covered guest tokens, privacy-aware IP hashing, trusted headers, Turnstile failures, cost/model mismatches, full guest report rendering, quota/concurrency races, expiry, cleanup, atomic/idempotent claims, cross-tenant replay denial, preserved approved profiles, and race-safe first-workspace provisioning. Type checking, linting and the final production build passed. The local test database was stopped afterwards. The app was restarted in loopback-only development mode for localhost testing.

`node scripts/guest-smoke.mjs` tested the actual localhost routes against Neon Auth/PostgreSQL, Cloudflare Siteverify test keys and OpenAI. It exited 0 with:

```json
{"check":"guest_report_private_without_token","status":"passed"}
{"check":"httponly_guest_cookie_issued","status":"passed"}
{"check":"missing_turnstile_rejected","status":"passed"}
{"check":"full_live_report_without_authentication","status":"passed","seconds":33,"inputTokens":2088,"outputTokens":2821,"estimatedCost":"0.005349"}
{"check":"guest_idor_denied","status":"passed"}
{"check":"claim_requires_authentication","status":"passed"}
{"check":"registration_after_complete_report","status":"passed"}
{"check":"account_without_guest_token_cannot_claim","status":"passed"}
{"check":"atomic_idempotent_claim_without_regeneration","status":"passed"}
{"check":"claimed_strategy_editable_and_saved","status":"passed"}
{"check":"saved_guest_strategy_survives_later_signin","status":"passed"}
{"check":"cross_tenant_replay_and_report_access_denied","status":"passed"}
{"check":"all_guest_acceptance_checks","status":"passed"}
```

The claim test compared the stored JSON before/after claiming and asserted the original analysis ID and single run were retained. Test credentials remained in memory. Summary: `.local-live-test/guest-acceptance.json` (Git-ignored). One paid guest report was generated; the initial session-creation attempt failed before any AI call and was retried successfully after database readiness/cold-start handling. A concurrent first quota-row insertion race was also caught by PostgreSQL tests and fixed using atomic SQL initialization plus a row lock.

Browser checks confirmed the updated landing copy, readable responsive layout, website input, enabled free-report CTA and successful official Turnstile test widget. Component rendering tests verify all nine report sections remain visible without account controls. Full browser-driven signup/print QA was not rerun; the complete signup/claim/save/reload journey was exercised through the same HTTP endpoints. Real production Turnstile keys, hosted platform metadata and scheduled cleanup remain intentionally unconfigured while work stays local. See `GUEST_REPORTS.md` for limits, privacy, cleanup and future activation requirements.

## Live Neon acceptance — completed

Connected only to project `misty-bar-85645678`, production branch `br-odd-cake-ba4pc9g8`. The Prisma migration applied successfully to live Neon PostgreSQL. `npm run build` exited 0 with `Compiled successfully`, generated all routes, and included the session Proxy. `npm run typecheck` and `npm run lint` passed. Current default `npm test`: **53 passed, three optional I/O tests skipped**. The isolated PostgreSQL integration test, including the new crawler metadata persistence regression, also passed independently.

With the built app running locally, `npm run test:neon` exited 0 and printed:

```json
{"check":"live_postgres_and_migrations","status":"passed"}
{"check":"unauthenticated_api_denied","status":"passed"}
{"check":"neon_auth_signup","status":"passed"}
{"check":"session_restoration","status":"passed"}
{"check":"authenticated_dashboard_and_organization","status":"passed"}
{"check":"authenticated_live_report_generation","status":"passed","seconds":40,"inputTokens":2208,"outputTokens":2610}
{"check":"edited_profile_saved_in_neon","status":"passed"}
{"check":"signout_clears_session","status":"passed"}
{"check":"signin_and_persistent_report_reload","status":"passed"}
{"check":"cross_tenant_read_and_write_denied","status":"passed"}
{"check":"website_evidence_persisted","status":"passed","pages":1}
{"check":"all_neon_acceptance_checks","status":"passed"}
```

This used real local HTTP endpoints, Neon sessions, Neon PostgreSQL and a paid OpenAI request. Test credentials stayed in process memory. Test accounts and the approved sample report remain for auditability. Summary artifact: `.local-live-test/neon-acceptance.json` (Git-ignored). Existing user data was not erased. Pixel-level browser/print QA, email verification delivery and Vercel production deployment remain unverified. Email verification is currently not required by the existing branch policy.

Initial attempts exposed a rejected AI report and a persistence error from extra crawler link metadata. The generation schema was tightened, equivalent source URLs canonicalized, and source writes changed to an explicit column mapping. A persistence regression test was added, and known usage now survives a later database failure. Three paid generation attempts occurred during this Neon acceptance work (two failed, one successful); no infrastructure billing plan changed. See `NEON_SETUP.md` for the separate CLI optional installer failure and account setup details.

## Live OpenAI smoke test

With the owner's configured key, a real crawl of `https://plausible.io/` and a real `gpt-4.1-mini` report generation passed the versioned schema and evidence checks. The initial attempt returned incomplete/invalid output. Raising the local output ceiling from 4,500 to 8,000 tokens allowed the bounded retry to pass. The successful report and exact usage are saved locally in `.local-live-test/saas-strategy.json` (Git-ignored). This verifies crawl → OpenAI → report validation, not browser authentication or PostgreSQL persistence against the live Neon project. Two paid generation requests were made.

- `npm test` with `TEST_DATABASE_URL` and `LIVE_CRAWL_TEST=true`: **53 tests passed across six files**, including development fixtures with a blank API key and no paid calls.
- `npm run typecheck`: passed with strict application TypeScript.
- `npm run lint`: passed with no warnings.
- `npm run build`: passed; all Next.js routes compiled using webpack.
- Initial Prisma migration: applied successfully to a fresh, isolated local PostgreSQL 18 cluster on loopback port 55439. No existing PostgreSQL service or external database was used.
- Real database tests: atomic duplicate/concurrency reservations; tenant-scoped denial; complete JSON persistence; normalized three-segment persistence; immutable approved versions; stale update rejection; monthly quotas; persisted failed provider runs with no fabricated output.
- Real network test: TLS request to example.com using the DNS-pinned socket returned 200, and ordinary HTML extraction returned the expected title and content. No paid AI call was made.
- Provider contract tests: complete output validated, malformed/truncated output rejected with known usage preserved, production mock mode rejected. The OpenAI transport was mocked for these tests.
- Edge browser: landing URL submission → explicitly illustrative preview → free signup entry. The normalized website URL survived navigation. Missing provider configuration was shown clearly. Screenshot capture timed out, so pixel-level responsive/print layout verification remains outstanding.
- Dependency audit: zero critical/high findings after scoped same-major Better Auth/Zod overrides; 23 remaining low/moderate findings in optional UI/email dependencies and lint tooling. Complete managed Auth integration needs live verification with those overrides.

The historical standalone checks below predate the successful Neon acceptance run above. No external GitHub repository or Vercel production deployment was created.

## Repeat optional integration checks

Default `npm test` skips external-I/O tests. To repeat database checks, initialize a **new dedicated local PostgreSQL cluster** with user `firstcustomers_test`, bind it only to `127.0.0.1:55439`, set `DATABASE_URL=postgresql://firstcustomers_test@127.0.0.1:55439/postgres`, and run `npm run db:deploy`. Then set `TEST_DATABASE_URL` to that same URL and run `npm test`. The test refuses other connection targets. It creates isolated records with random identifiers and does not erase existing data. Stop the dedicated cluster afterwards.

Set `LIVE_CRAWL_TEST=true` to additionally fetch the public example.com website. This test has no AI dependency. These database/network tests do not substitute for real Neon session tests.

## Report schema artifact

`schemas/sales-strategy.v1.json` is the generated JSON Schema snapshot for integrations. Zod is authoritative. Regenerate the snapshot after changes; bump `schemaVersion` and add migration/reader handling before introducing incompatible report changes. Historical JSON must remain readable; no incompatible migrations are implemented yet.
