# Milestone 2 — Progressive sales strategy refinement

Implemented 4 November 2026. The initial guest report remains complete and registration remains optional.

## Workflow

After reading the initial report, founders can optionally supply traction, weekly time, zero-inclusive budget and currency, challenge, channels, geography, stage and preferred approach. Previous answers are reused. A separate refinement workflow consumes stored product intelligence, source excerpts, unknowns and previous recommendations; it never invokes the crawler.

The refined report leads with the executive summary and recommended first move, then founder-confirmed context, customer segments, 2–3 ranked channel experiments, a paying-customer acquisition playbook, four weeks of work and messages. Product facts and source evidence are preserved. Founder confirmation is distinct from website verification; every channel is explicitly an unvalidated inference. Market research, prospect discovery, CRM and automated outreach remain unimplemented.

## Persistence and access

`StrategyRevision` stores versioned context and strategy JSON, original analysis provenance, status, lease, model, tokens and estimated costs. `StrategyApproval` records approval history. The original analysis, website source content and existing approved profiles are not overwritten or duplicated. Signed-in founders can edit strategy sections and save a new approved revision; old revisions remain readable. Current approval is selected when reopening a product.

Revisions reference the original `AnalysisRun`, so existing secure guest claiming transfers all revisions with that analysis. Expiry, HttpOnly guest cookies, active membership and tenant-scoped authorization apply. Guest cleanup cascades only through expired unclaimed analysis records.

Guests receive one successful refinement and at most two attempts. Identical successful context reuses the previous result. Refinements share global daily/IP/concurrency admission controls with initial guest generation and share monthly, concurrency and per-minute limits for accounts. Atomic locks protect reservations. Generation has a lease, no automatic paid retry, bounded input including structured schema and bounded output (at most 4,500 tokens). Known usage is retained on invalid AI output. Failed refinements preserve the original report.

## Contracts

- `schemas/sales-strategy.v1.json`: existing initial report, unchanged.
- `schemas/sales-strategy.v2.json`: strict strategy-only output.
- `schemas/founder-context.v1.json`: optional founder context.
- Runtime Zod checks also enforce currency requirements, channel exclusivity, exact acquisition stages/priorities/weeks, total channel costs, channel effort and weekly action time. These cross-field rules extend the JSON Schema snapshots.

Time bands use conservative planning allowances: 45, 60, 180, 360 or 660 minutes. Exact weekly minutes can be supplied. Missing time assumes 60 minutes, explicitly labeled; missing budget permits no committed direct spend. These are planning assumptions, not inferred founder facts.

## Migration and environment

`20261104020000_strategy_revisions` adds two tables and indexes, preserving existing tables and reports. It was first applied to the isolated local PostgreSQL instance. The same migration then passed against the verified existing FirstCustomers project `misty-bar-85645678`, using the existing direct database environment variable. Both tables were checked and the original analysis count was preserved.

`STRATEGY_REFINEMENT_ENABLED=true` was added to ignored `.env.local` only after migration. All pre-existing environment values were programmatically compared and preserved. No Neon management API, new API key, MCP integration, or EDUCERT access was used.

## Verification

- TypeScript and ESLint passed.
- Final full automated suite: 12 test files passed; 97 tests passed, 3 optional external tests skipped (100 total). The real refinement test was run separately and passed.
- Local PostgreSQL tests cover guest refinement/history, duplicate suppression, failed AI usage, retry, concurrency, expiry/cleanup, secure claiming, cross-tenant denial, approvals and manual revision edits without overwriting earlier output.
- Three deterministic founder personas produce different priorities: zero-paying/under-one-hour/zero-budget, 1–10 paying/five-hours/moderate-budget, and over-200 paying/dedicated-time/significant-budget.
- Provider tests exercise the real SDK JSON-schema conversion, bounded requests and invalid output. They caught and corrected an unsupported tuple before any paid call.
- One explicitly opted-in real OpenAI refinement passed with synthetic SaaS input and zero-budget/under-one-hour context. It performed no crawl or database access. Normal tests do not make paid AI calls.
- Browser → API → local PostgreSQL → report rendering verified using clearly labeled deterministic mock AI: initial report, questionnaire, refined report, founder context, first move, preserved facts and version selection all worked without registration.
- Print CSS reduces forced page breaks and spacing; outreach escaped newlines render correctly and repeated URLs within a claim are deduplicated. Native browser headers/footers remain controlled by the browser print dialog. A rendered PDF was not visually inspected.
- Neon Auth signup/login was not repeated in this milestone; the existing auth integration is unchanged. Claiming and tenant authorization were tested against real local PostgreSQL.

## Local use

Run `npm run dev`, open http://localhost:3000, submit a SaaS URL, then use **Make your sales strategy more realistic** below the complete report. Local Turnstile test configuration remains development-only; public deployment is still disabled until production bot-protection settings are supplied.

Browser verification screenshot uses synthetic sample data, not a real website assessment: `.local-live-test/milestone2-refined.png` (ignored).

## Final command evidence

```text
npm run typecheck
> tsc --noEmit
(exit 0)

npm run lint
> eslint .
(exit 0)

npm test -- --maxWorkers=1 (TEST_DATABASE_URL: isolated localhost cluster)
Test Files  12 passed | 3 skipped (15)
Tests       97 passed | 3 skipped (100)

LIVE_REFINEMENT_TEST=true MOCK_ANALYSIS=false npx vitest run tests/live-refinement.test.ts
Test Files  1 passed (1)
Tests       1 passed (1)

npm run build
Compiled successfully in 3.4s
Finished TypeScript in 5.2s
Generating static pages ... (13/13)
(exit 0)

npm run dev
Local: http://127.0.0.1:3000
Ready in 542ms
```

Initial sandbox connection and `.next` write-permission failures were resolved by running the authorized local verification commands with the required execution permissions. The local migration, final build and tests subsequently passed. There are no known unresolved build/test failures. No public deployment was performed.

A final scan of 486 non-vendor workspace files, including regenerated build artifacts and logs, found no copies of private environment credentials outside `.env.local`. Explicit Git ignore checks passed for `.env`, `.env.local`, `.env.production.local`, `credentials.json`, `private.key` and `.mcp.json`.
