# Stage 2B: signed-in acquisition advisor

The local signed-in flow works with real PostgreSQL persistence and clearly labeled local auth/AI/source fixtures. Work stops here for owner review. No paid AI calls, production migration or deployment occurred during Stage 2B.

## What the founder can do

Open the acquisition advisor from the existing workspace, enter a SaaS URL, and answer three optional groups: product stage, weekly time/monthly budget, and previous acquisition efforts. Save answers and return later. Existing exact saved answers are imported conservatively; zero and skipped values remain distinct.

Generate one saved compact strategy, then see its buyer, channel, access check and first seven-day tasks. Buyer/channel reasoning, full task instructions, fallback and detailed criteria are expandable. Completion saves immediately, rolls back visibly if saving fails, and persists after refresh and sign-out/sign-in. Completion represents activity, not customers or revenue.

Request an explanation or help with a selected task. Responses are saved and reused for the same strategy/task-progress snapshot. Assistance can create only its own response record; it cannot write strategy/task content. The saved strategy remains immutable. This release deliberately does not offer strategy replacement, weekly reviews or results analysis.

## Small improvements from Stage 2A

- Plans allocate at most 85% of weekly availability, leaving execution headroom. The demonstrated Senja plan uses 140 of 180 available minutes, with 40 minutes free.
- The strategy contract now requires a concrete channel-access check and a conditional fallback for the same buyer. The founder verifies access; the app does not claim to have researched prospects or checked community permissions itself.
- Tally explicitly checks for suitable permitted threads before preparation/promotion and retains actual paid-offer verification. It does not invent a paywall or sell consulting services.
- Short task titles support scanning; detailed instructions expand on demand. The dashboard avoids repeated “Record: Record” labels and long report sections.

The Stage 2A contract/prompt and genuine outputs remain untouched. The app extends that contract in `src/modules/advisor/schema.ts` with task titles, access check/fallback and its own version. The revised prompt uses real saved founder context and resource headroom. It has not been tested with a fresh live model call; local fixture variants are not presented as genuine new Sol outputs.

## Review locally

The feature worktree is on **`codex/stage-2b-signed-in-advisor`**, in the existing `firstcustomers-stage2a` worktree directory. Original `main` and its uncommitted work remain unchanged. Clean baseline commits: `7ffd792` (approved Stage 2A checkpoint), then `e288285` (preserved original reliability work). Stage 2B implementation is the reviewable diff against `e288285`.

Local app: [acquisition advisor](http://localhost:3100/advisor). Sign in through the normal application sign-in page using the **synthetic fixture accounts** `alice@example.test` or `bob@example.test`, password `fixture-password-123`. These are not real accounts or credentials. The unchanged Neon Auth adapter talks to a loopback upstream fixture, including its signed session-cookie flow; production auth has no bypass.

Use `https://senja.io/` or `https://tally.so/` in local fixture mode. Source extraction uses the saved attributed evidence, and model calls use a loopback OpenAI-compatible transport fixture. The UI labels both fixture plans and fixture assistance. No provider key is needed.

Restart the local app/fixtures from this worktree if necessary:

```powershell
node scripts/advisor-local.mjs
```

The dedicated local Postgres must also be running. Its recorded target is **127.0.0.1:55441 / firstcustomers_advisor_dev**, role `firstcustomers_test`, data under ignored `.local-test-db`. The development launcher explicitly configures that target and local auth/AI services; it does not read production credentials. Fixture mode rejects production and any other database target.

## Persistence and migration

[The development target was documented before database changes](../stage-2b-development-target.md). The new migration is [20261105030000_signed_in_advisor](../../prisma/migrations/20261105030000_signed_in_advisor/migration.sql).

It adds four tables: workspace/context/evidence snapshots, immutable strategy, task completion, and bounded AI operation/assistance records. No historical table or report JSON is rewritten. Existing Product has only a new inverse Prisma relation. Foreign keys restrict deletion; SQL checks enforce versions, task completion state and operation states.

Before applying, the target was confirmed using `current_database()`, `current_user`, `inet_server_addr()` and `inet_server_port()`. All four repository migrations applied successfully to the fresh local database only. A database regression created a legacy report, exercised the advisor, and confirmed the original report JSON was unchanged.

Production migration/deployment remains unapproved. The advisor feature flag defaults off, so deployments without the new migration retain their existing behavior.

## AI configuration and safeguards

Independent configuration: `ADVISOR_STRATEGY_MODEL=gpt-6.1-sol`, `ADVISOR_PROFILE_MODEL=gpt-4.1-mini`, `ADVISOR_ASSIST_MODEL=gpt-4.1-mini`. `OPENAI_MODEL` and existing report/refinement settings are unchanged. `ADVISOR_ENABLED` and `ADVISOR_LIVE_ENABLED` both default false; live paid calls require a separate explicit enablement after review. `.env.example` documents the new settings; no real environment file was copied or edited.

The existing SSRF/robots-aware crawler and attributed identity selection/hydration are reused. A valid attributed saved report can supply product identity without another crawl/identification call. Advisor identification is stored separately, avoiding any change to legacy report readers. Owner quotations remain server-validated.

Each operation reserves a conservative spending allowance before dispatch: up to $0.30 for initial identity/strategy, $0.03 for assistance, within a conservative configurable global daily reservation cap (default $2). Each SDK request also has a calculated worst-case token-price check against its operation ceiling. Rates are explicitly paired with supported configured models; unknown models fail closed. SDK retries are disabled, deadlines/leases are bounded, and usage/cost is persisted. On failure, its reservation remains charged conservatively, including when usage is unknown. No automatic repair, grader or orchestration pipeline was added.

Ownership checks traverse product → authenticated organization on every read and mutation. Strategy publication checks the context version and lease transactionally. Task writes use optimistic versions. Duplicate strategy requests reuse the saved strategy, duplicate help reuses its result, and account request/concurrency/monthly quotas apply. Origin and existing streamed body-size checks protect mutation routes. Sensitive prompts, credentials and raw provider errors are not logged.

## Verification evidence

The verified story is browser → existing authentication adapter → advisor API → actual local Postgres → persisted strategy/task/help → browser after refresh and sign-in.

| Boundary | Evidence |
| --- | --- |
| Sign-in | Actual app sign-in form and auth proxy/SDK, backed by local upstream fixture; no app auth bypass |
| Onboarding | Answers saved, reloaded and prefilled; Tally test also generated successfully with all answers skipped |
| Strategy | Single saved buyer/channel/plan; profile/evidence validated; 140/180-minute Senja plan; explicit access check and fallback |
| Progress | Checkbox survives reload and sign-out/sign-in; stale writes return 409 |
| Assistance | Explanation/task guidance use the local AI transport, save/reuse responses and leave strategy JSON/ID unchanged |
| Authorization | Other signed-in account receives 404 for reading/writing the product; wrong Origin returns 403 |
| Legacy data | Real database regression confirms original report JSON unchanged; existing report/auth/guest unit tests pass |
| Responsive/a11y | Desktop and 390px mobile screenshots; no horizontal overflow; zero axe violations; no browser page errors |
| Build/checks | Production compilation/build, TypeScript, lint and whitespace checks passed |

[Machine-readable primary browser verification](browser-verification.json). The primary Senja browser scenario passed end to end. The separate Tally skipped-context/fallback browser scenario passed. Initial fixture testing exposed delayed checkbox feedback and a shared worktree Vite cache; these were corrected with immediate UI feedback plus rollback, and a worktree-local test cache. A later test correctly hit the per-account rate limit; Tally now uses its own fixture account instead of weakening the limit.

Full offline suite: **258 passed, 46 skipped**. The dedicated local Postgres/AI-transport integration test also passed separately. These technical checks establish the local flow, not commercial performance or new live-model quality.

Screenshots:

- [Onboarding, desktop](screenshots/onboarding-desktop.png)
- [Advisor, desktop](screenshots/advisor-desktop.png)
- [Task assistance, desktop](screenshots/advisor-help-desktop.png)
- [Advisor, mobile](screenshots/advisor-mobile.png)
- [Tally access fallback, mobile](screenshots/tally-mobile.png)

## Remaining review gates

No blocker remains for the demonstrated fixture-based local signed-in flow. Fresh live Sol generation with the revised prompt/contract and live assistance needs separately approved paid testing. Hosted Neon Auth behavior with the new routes has not been re-tested against the remote service; the existing adapter is unchanged. Real channel access, community permissions and eventual paid conversion remain founder-validated experiment questions, not proven model facts.

No Stage 3, weekly AI reviews, guest advisor, CRM/Telegram, autonomous outbound, report/PDF expansion, production migration or deployment was started. Work stops for review of this local signed-in MVP.
