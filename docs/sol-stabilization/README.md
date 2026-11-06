# Sol initial-report stabilization

## Implemented locally

Verified model identifier and account availability with the non-generation models endpoint: `gpt-6.1-sol`. Official documentation confirms Responses API, structured outputs and low reasoning support: https://developers.openai.com/api/docs/models/gpt-6.1-sol . Standard rates per million tokens: input $2, cached input $0.10, cache writes $2.50, output $10. Requests use standard service tier; no long-context surcharge applies at these limits.

Initial identification, acquisition generation, quality review/repair and founder refinement share OPENAI_MODEL, now defaulting to Sol. The isolated worktree's ignored local configuration explicitly selects Sol; original main environment and production are untouched. Weekly advisor configuration remains independent. Low reasoning is explicit to retain output headroom. Initial aggregate token ceilings remain unchanged; within them Sol identification receives up to 1,200 tokens and acquisition up to 3,500. Unknown models retain conservative byte preflight; known Sol uses o200k counting plus the existing 25%/512-token margin and actual-usage enforcement.

Repair retains original scalar enum, integer and numeric/string bounds rather than replacing them with unconstrained primitive types. A pricing-status correction can downgrade to Unknown and remove unsupported pricing citations; it cannot invent replacement evidence. Other evidence/identity protection and the one-repair maximum remain intact. Existing relational resource arithmetic still rejects inconsistent work. Repair instructions explicitly require complete concise sentences.

The deterministic observable-outcome vocabulary now recognizes describing a bottleneck, completing a useful event and considering a purchase path. This addresses the genuine Sol trace, not a schema-only fixture. Commercial review and unsupported-claim checks remain mandatory. No passing semantic score is fabricated.

Sol cost reservations use conservative $2.50 input/$10 output rates, including cache-write exposure; actual live metrics use billed cache categories. Cost configuration cannot silently reuse Mini rates for Sol. Example configuration documents Sol guest/refinement budgets ($0.15/$0.20), retaining explicit fail-closed admission checks; the local refinement configuration uses $0.20. These are operator-configured maxima, not authorization for more calls. No production configuration changed. Actual output usage includes reasoning tokens; they are not added a second time.

## One genuine attempt

See `summary.json`, original responses and `2-output.txt` for complete genuine content. Exactly one analysis attempt, three API stages, no retry or extra evaluation. Aggregate authorization $0.20; actual estimated cost **$0.0393555**, conservative cost $0.03936. Input **5,656**, output **2,522**, resolved model `gpt-6.1-sol`.

**Result: not accepted.** Product identification and strategy generation completed. The gate initially requested a stronger buying step in continueWhen; the bounded repair completed but returned a clause ending in a comma. Subsequent checking rejected the otherwise observable commercialLearning sentence in seven derived presentation fields because its verbs were absent from the metric vocabulary. Semantic AI quality review was not reached. No token-limit or spending-limit exhaustion occurred.

That vocabulary defect was fixed afterward and regression-tested. The final implementation has not had another live run. The original rejected output and repaired text remain untouched; neither is represented as an accepted report. The added repair prompt requests complete sentences, but its actual improvement also remains unverified live.

Commercial assessment: the generated founder-led B2B SaaS launch/page-refresh segment is substantially more focused than the previous broad small-business output. Public launch signals, researched contact routes, five contacts, zero spend and 85 minutes of work within a 90-minute assumption form a plausible first experiment. Agencies and course businesses are differentiated alternatives. Monetization uncertainty and no-access stop conditions are explicit; silence is inconclusive. Buyer access and paid conversion still need observation, and agreeing to try alone is insufficient buying evidence. This is promising acquisition reasoning, not an accepted commercially validated report.

## Verification and failures

- Final default suite: **270 passed, 51 opt-in tests skipped**.
- Isolated advisor PostgreSQL integration: **4 passed**. An earlier run hit the synthetic database's accumulated daily reservation allowance. The fixture-only test allowance was aligned with the existing weekly fixture allowance (100); application limits and bucket contents were not changed or reset. No paid calls use these fixture settings.
- Initial regressions exposed legacy tests relying on the implicit Mini default; they now select Mini explicitly to retain their historical stage-ceiling coverage. Sol request construction has separate coverage.
- TypeScript caught a Zod array element type mismatch; fixed with the correct ZodType cast. Final production build and standalone TypeScript pass. ESLint and diff checks pass.
- Production build passed with local filesystem permission. No production migration, deployment, push or merge.
- Older report/guest/tenant database integration suites require the separate unavailable 55439 cluster and remain opt-in/unverified here. No new database infrastructure was provisioned.

Changes are local and uncommitted on `codex/stage-3-weekly-advisor`. Main worktree is preserved. No EDUCERT access, credential creation or infrastructure change occurred.

## Remaining blocker

The final source needs a separately authorized genuine acceptance attempt to establish a complete accepted report including semantic review. The sole authorized attempt has been consumed. No further paid request was made, and this work does not claim a successful end-to-end live pipeline.
