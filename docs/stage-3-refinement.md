# Narrow weekly-advisor refinement

No new feature, schema, decision enum, resource limit, approval rule, infrastructure or deployment change.

## Exact changes

- `src/modules/advisor/provider.ts`: weekly-review instructions now reuse supplied attributed/explicitly founder-confirmed facts and their provenance. Ask for verification only for a specific missing, conflicting, uncertain or demonstrably changed fact, explaining its relevance. Founder confirmation is not independent verification; budgets/customer speculation/task completion do not become product facts.
- Same prompt: state shared permission/free-access/verified-offer constraints in the relevant existing fields once. Repeat a safeguard inside a task only when it governs that action. Keep evidence IDs, uncertainty, actual stop conditions, zero-spend protections and approval requirements.
- Same prompt: estimate effort from preparation, records/prospects, research, personalization, follow-up and review. Use a time-boxed representative subset when a full audit will not fit. Do not default to 150 minutes, equal task shares or the prior total; do not artificially vary totals either. The existing maximum 85% time allocation, currency and spending checks remain unchanged.
- `src/modules/advisor/weekly-presentation.ts` and `src/components/advisor-weekly.tsx`: display **Keep strategy — adjust execution** for Adjust when buyer segment and channel name are unchanged. Apply the same display label to the proposal and decision history. Stored decision remains Adjust; Continue/Reconsider and material-change confirmation semantics are untouched. Historical records are not rewritten.
- `tests/advisor-weekly-refinement.test.ts`: regressions check label conditions, unchanged source objects, actual provider request construction with supplied founder facts, unchanged model/token cap and the refined instructions using a synthetic transport only.
- `e2e/advisor-weekly.spec.ts`: update the expected user-facing Adjust wording in the existing complete-cycle browser regression.

The existing three-group founder input contract was not expanded with new pricing/product fields. The instruction reuses facts actually present in saved review inputs; it does not invent facts where the application has no confirmed value.

## Validation

Full offline suite: **266 passed, 51 skipped**. TypeScript, ESLint and production build passed. The production build includes the existing weekly advisor routes. No paid calls or migration ran during this refinement.

The existing fixture browser regression checks recorded results → pending proposal → explicit approval → preserved strategy/new plan → history, including mobile accessibility. Its result is recorded in `docs/stage-3/browser-verification.json`.

## Release status

No local unit/type/lint/build blocker was found. The revised prompt has not been tested with new live AI responses: fixtures verify application behavior and labels, not actual reduction in repetition or improved model estimates. The three earlier genuine reviews remain preserved as prior-version acceptance evidence; they are not presented as outputs from this refinement. A further paid check requires separate approval. No deployment or production migration is authorized by this work.
