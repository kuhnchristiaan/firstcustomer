# Committed stabilization acceptance — NOT WORKING

Initial stabilization commit: `21b0827cb004544045c2ed09272b6b57cea761c1`. Exactly one newly authorized genuine initial Senja analysis with GPT-6.1 Sol, maximum $0.10. No retry or additional paid attempt.

## Genuine result

The report did not pass the full quality gate. Identification and acquisition generation completed. A deterministic check incorrectly rejected `commercialLearning` describing a concrete purchase step because its observable-event vocabulary omitted purchase. The single repair request was then rejected by the provider with HTTP 400 / `invalid_json_schema`; its schema included a negative lookahead. Semantic review was never reached and no report was accepted.

Known token usage: 3,657 input and 2,133 output, including reasoning. Usage-derived estimated cost: **$0.0223335**; conservative known-cost estimate $0.0304725. The rejected repair supplied no token usage; its $0.0458325 reservation remains conservatively held, so the recorded upper reservation exposure is $0.076305, below $0.10. Provider invoice reconciliation was not performed. The whole configured pipeline's theoretical token envelope is $0.13; this test instead guarded every dispatch under the stricter $0.10 shared ceiling and would stop if the next stage could not fit. No application token/cost limit was raised.

## Commercial assessment

The candidate is a useful starting hypothesis: independent course creators with an enrollment deadline, public business contact routes, four individually researched emails and zero direct spend. Resource arithmetic is consistent: 20 + 4*(8+3) + 11 = 75 minutes. It distinguishes activation, repeat usage and confirmed SaaS payment, leaves pricing unknown and treats silence as inconclusive. Seasonal willingness to pay is explicitly a risk. The Continue criterion remains weaker than confirmed buying evidence. This promising candidate is not a commercially approved report or a passed semantic review.

See [complete genuine candidate](candidate.md), original responses, requests, stage metrics, `3-failure.json` and `summary.json`. No original failure was overwritten or converted to success.

## Offline corrections after the attempt

- Added purchase-event wording to the deterministic observable-event vocabulary. The saved candidate now reaches semantic review unchanged in an offline provider regression.
- Separated provider-compatible wire constraints from strict local completeness constraints. Original scalar bounds, enums and descriptions remain on the wire. The negative-lookahead completeness check remains mandatory in local patch parsing/application, so incomplete repairs still fail rather than bypassing validation.
- Regression tests inspect the wire schema for the unsupported lookahead, reject the genuine incomplete repair locally, and exercise the saved current candidate through final acceptance with an explicitly scripted semantic review. This is offline fixture acceptance, not a successful second live attempt.

Final verification: **284 tests passed, 51 opt-in skipped**. ESLint, production build, standalone TypeScript and diff checks passed. No semantic thresholds, budgets or repair-loop counts were changed. The completed pipeline still needs genuine accepted-output confirmation; no more paid calls were made.

The unrelated local advisor fixture-allowance edit was excluded from the stabilization commits. Original main and production remain untouched. No push, merge, deployment or migration.
