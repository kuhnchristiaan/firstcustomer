# Stage 3: weekly results and strategy improvement

Implemented on `codex/stage-3-weekly-advisor`. The approved Stage 2B/live-smoke baseline is checkpointed at `120a763`. Existing reports, source evidence and previous advisor records remain preserved.

## Founder flow

Record prospects contacted, replies, qualified conversations, trials/activations, paying customers and qualitative feedback. Blank metrics are stored as null (unknown); explicit zero stays zero. Confirm the tasks actually completed. No acquisition metric is calculated from task completion.

Save results first, then request a review. The proposed Continue, Adjust or Reconsider decision explains evidence, uncertainty and reasons for the next three to five tasks. Nothing is activated by generation. The founder must approve the next plan; a changed buyer or acquisition channel also requires an explicit material-change checkbox. Prior plans, outcomes and decisions remain readable in the dashboard history.

An accepted next plan receives fresh unchecked tasks. Ordinary execution adjustments preserve the strategy version. Material buyer/channel changes increment it. Result/proposal records are immutable; duplicate results are idempotent only when their facts match, conflicting submissions return 409, and approval checks the expected active plan transactionally. Repeated approval returns the already-created plan instead of duplicating it.

## Intelligence and boundaries

The weekly provider uses the separately configured strategy model (default GPT-6.1 Sol), saved founder constraints/product evidence, original strategy, current plan, reported results and up to six relevant previous reviews. Explanations now receive actual recorded outcomes and distinguish unaccepted proposals. Their cache key includes review state so old explanations are not reused after new results.

Existing token/cost ceilings, leases, request quotas and disabled SDK retries are reused. Resource checks retain time headroom and enforce budget/currency. No repair/grading pipeline was added. A week passing or sparse exposure alone is not evidence to reject the strategy.

Local review fixtures produce different proposals for qualified interest/objections versus unavailable channel access. They are clearly labeled synthetic transport outputs, not genuine new model evaluations. No paid calls were made for Stage 3; live review quality still needs separate approval and testing.

## Migration

[Target documented before changes](../stage-3-development-target.md). One additive migration adds a weekly-review table and a strategy-version marker to existing immutable accepted-plan snapshots. It extends the operation-kind check for review calls. No task reassignment or content rewrite was needed.

Applied only to local `firstcustomers_advisor_dev` at `127.0.0.1:55441`. [Before/after hashes](../stage-3-migration-verification.json) confirm preservation of existing reports, strategies and task state. No production migration or deployment occurred.

## Verification

- Full offline suite: 264 passed, 49 opt-in tests skipped. TypeScript and lint passed.
- Local Postgres/AI-fixture integration: Continue, Adjust and Reconsider cycles passed, including duplicate/conflicting results, stale approval, material confirmation, cross-account denial, fresh tasks, preserved previous plans and explanations that leave the accepted plan unchanged.
- Browser cycle: saved strategy → completed activities → recorded outcomes → pending Adjust proposal → explicit approval → next plan → retained history. Unknown paying-customer count stays unknown and the original buyer/channel are preserved.
- Desktop/mobile screenshots and machine-readable browser observations are saved here. Mobile accessibility and browser page errors are checked in the browser test.

The browser example reports six prospects, two replies, two qualified conversations, zero activations and unknown payments, with a pricing objection. The next plan addresses that objection and follows up qualified interest instead of switching strategy or repeating completed setup.

## Review

[Open locally](http://localhost:3100/advisor). Local fixture accounts: `alice@example.test` or `bob@example.test`, synthetic password `fixture-password-123`. Start/restart using `node scripts/advisor-local.mjs` after the dedicated local PostgreSQL instance is running. Live AI stays disabled.

- [Results screenshot](screenshots/results-desktop.png)
- [Pending proposal screenshot](screenshots/proposal-desktop.png)
- [History screenshot](screenshots/history-desktop.png)
- [Next plan on mobile](screenshots/next-plan-mobile.png)
- [Browser observations](browser-verification.json)

Remaining limits: no new live-model or hosted-auth acceptance is claimed; failed review attempts preserve results/current plan and are shown as failures without automatic retries. No production changes, integrations, scraping or autonomous outreach were made. Work stops for owner review after local verification.
