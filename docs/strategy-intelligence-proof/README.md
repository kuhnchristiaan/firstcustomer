# Stage 2A: Strategy Intelligence Proof

Status: implementation and offline checks complete; **paid calls await owner approval**. No genuine new strategies have been generated. The empty review page explicitly says so; test fixtures are not candidate advice.

## Scope and isolation

Branch: `codex/stage-2a-strategy-proof`, based on `df4415d` in a separate Git worktree. The original checkout remains on `main`. Before branching, all 83 pre-existing modified/untracked files were copied and SHA-256 hashed in the sibling `firstcustomers-stage2a-preservation` directory. A binary tracked diff, original status and base commit are also saved there. Final verification found all 83 original files byte-identical.

The inherited uncommitted contract-reliability work improves clause completeness, resources, actual-SaaS monetization and legacy assembly. It remains intact in the original checkout; Stage 2A does not merge or rewrite it. Only four saved evidence files were copied into this proof, byte-for-byte from `docs/model-intelligence-benchmark-2026-11-05/` in that checkout. Their hashes are in the prepared protocol. Existing dependencies and generated types are linked for offline checks; no installation or provider configuration occurred.

This branch adds only:

- `src/modules/advisor-proof/contract.ts`: independent compact contract, the three optional founder-context groups, candidate prompt/request and fixed test spending policy.
- `src/modules/advisor-proof/presentation.ts`: complete Markdown strategy and a small, escaped standalone HTML review page.
- Two tests: offline contract/presentation checks and an explicitly gated prepare/live/display evaluation harness.
- These evaluation documents, saved evidence and prepared requests.

No app route imports this code. No dashboard, onboarding interface, guest flow, database migration, auth change, weekly review or strategy-history feature is included. Production model settings and infrastructure are untouched.

## What the candidate must decide

One buyer and buying trigger, one acquisition channel with a concrete way to find prospects, and short reasoning explaining the buyer priority and the channel trade-off. Three to five seven-day tasks include activity records, realistic time and direct cost. The strategy records available resources, evidence to collect, continue/adjust/reconsider conditions and only important unknowns. Product evidence IDs reference the saved attributed owner statements.

Founder inputs are stage; resources (weekly hours and monthly budget/currency); previous acquisition efforts. Every group can be skipped. Null means unknown; zero is preserved. There is no onboarding UI. The prompt requires explicit assumptions for missing resources, rather than invented founder facts.

The complete strategy aims for 250–450 words, including tasks, resource basis and criteria. No string field has a maximum character length. The 12,000-output-token cap includes reasoning and exists solely as a financial backstop; it is not a request to generate that much text or a substitute for realistic founder resources. Text is never sliced, repaired or rewritten. Word count and resource sums are displayed for commercial review, not used as automated quality scores. The only schema checks are basic shape, task count and supplied evidence-ID membership; existing attribution validation checks saved source provenance.

## Concrete paid test proposed for approval

| Item | Proposal |
| --- | --- |
| Calls | Exactly two maximum: one Senja strategy, one Tally strategy |
| Model | `gpt-6.1-sol`, medium reasoning, Standard/default processing |
| Evidence | Existing 5 November 2026 owner profiles, validated against their saved website snapshots; no new crawl or research |
| Founder context | Same **hypothetical** scenario for each: launched with no paying customers; three hours/week; USD 0 monthly budget; no prior acquisition efforts |
| Why these cases | Senja tests a focused buyer/trigger for testimonial software. Tally tests whether free activation can be distinguished from a verified paid SaaS offer, without inventing a paywall or selling setup services. |
| Output | One full original response, raw visible text, compact strategy Markdown and usage/metadata per attempt; shared HTML review page |
| Retry/repair/grader calls | None. A transport failure stops the run; invalid or incomplete content is retained without repair. |
| Limits | 120 seconds/call, 12,000 output tokens/call including reasoning, two calls maximum |
| Total hard ceiling requested | **USD 0.40** |
| Prepared worst-case reservation | **USD 0.2886575**, including conservative byte-based input reservation, cache-write premium and all allowed output tokens |

The [official Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) documents structured outputs and Responses compatibility. Its Standard rates used here are $2/M input and $10/M output; reservations conservatively price all input at the $2.50/M cache-write rate. Actual recorded cost is an upper estimate from reported usage, without assuming caching discounts. Check pricing again before an approved run; changed policy/rates require a new reviewed protocol. No call, tool use or secondary evaluation falls outside the stated ceiling.

Both contexts are test assumptions, not real founder outcomes or claims about the companies' stage. This first test reviews the compact advice on its merits. Comparisons with historical strategies are qualitative: those earlier runs used unknown-founder assumptions and a different contract, so this is not a controlled model benchmark or evidence of measured quality improvement.

Prepared request hash: `1870bbc6d538254c00dc326bcf453fe77b5938bba0c5eb1ba6da0c9db9b0851a`.

Review [the exact protocol and requests](run-1/protocol.json), [the spending proposal](run-1/approval-request.json), or [the standalone review page](run-1/review.html). No paid calls have been approved by those files.

## Running the proof

Commands run from this feature worktree. `prepare` has already run successfully; it creates `run-1` exclusively and refuses to overwrite existing artifacts. Normal `npm test` skips the evaluation harness. Rebuilding the HTML page is offline:

```powershell
$env:STRATEGY_PROOF_MODE = 'display'
npx vitest run tests/advisor-proof-evaluation.test.ts
Remove-Item Env:STRATEGY_PROOF_MODE
```

**Only after explicit owner approval of this test and ceiling**, the live command is:

```powershell
$env:STRATEGY_PROOF_MODE = 'live'
$env:STRATEGY_PROOF_APPROVED_SHA256 = '1870bbc6d538254c00dc326bcf453fe77b5938bba0c5eb1ba6da0c9db9b0851a'
$env:STRATEGY_PROOF_ENV_FILE = 'C:\Users\Kuhn\Documents\Code\FirstCustomer\.env.local'
npx vitest run tests/advisor-proof-evaluation.test.ts
Remove-Item Env:STRATEGY_PROOF_MODE, Env:STRATEGY_PROOF_APPROVED_SHA256, Env:STRATEGY_PROOF_ENV_FILE
```

This only reads `OPENAI_API_KEY` from the selected Git-ignored FirstCustomers file; it does not load or mutate production model settings. No environment file was read during preparation. The live harness checks the approved protocol hash, saved evidence hashes and current request policy before reading credentials. It reserves cost durably before dispatch, disables SDK retries and obtains an exclusive one-run lock. Unknown usage keeps the full reservation and stops further calls. It does not log request headers or provider error text. If an attempt fails or is interrupted, inspect artifacts and obtain approval before any new attempt; there is no automatic resume.

Review `run-1/review.html` or the per-product `*-strategy.md` files after the approved run. Completed/valid means the API and schema completed, not that the advice is commercially sound. Raw `*-response.json` and `*-output.txt` preserve the entire original response, including incomplete content. Never treat passing local checks as genuine model success.

## Commercial review and stop point

For each genuine strategy, review:

1. Does this buyer have a specific buying problem the actual SaaS solves, and why start there?
2. Can this founder reach those people through the proposed channel, with a convincing trade-off against an alternative?
3. Are all tasks executable in three hours and zero spend, including preparation, follow-up and learning?
4. Do the observations distinguish activity, replies, qualified interest, activation, adoption and actual SaaS payment without invented offer details?
5. Can the complete plan be understood in two to three minutes, with enough reasoning and useful decision criteria?

Preserve failures and disagreements. After the first genuine outputs, stop and present both in full for owner review. No model replacement, additional run or Stage 2B implementation follows automatically. Stage 2B requires strategy-quality approval.

## Offline verification

- Full isolated-worktree suite: **238 passed, 43 skipped**; 24 passing files, 12 opt-in files skipped. Different from the original working tree because its uncommitted work was deliberately left there.
- Six new contract/presentation checks passed, including untruncated reasoning, skipped/zero resources, evidence IDs, resource diagnostics and safe complete HTML output.
- Preparation separately passed against both real saved evidence packets, with zero paid calls.
- An intentional live-mode probe without an approval digest was rejected before credential loading or creation of a live-attempt lock. This expected rejection is separate from the passing offline suite.
- TypeScript and lint passed.
- All 83 original changed/untracked files remained byte-identical. The original branch stayed `main`.
- No build/deployment or database connection was needed for this isolated, unimported evaluation code. No production migration, provider operation or EDUCERT access occurred.
