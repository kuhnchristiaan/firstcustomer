# Milestone 6.1 engineering report

Implemented locally on 5 November 2026. **No new paid model calls, database/infrastructure changes or deployment.** The original four-site live evidence is preserved; its 24 original artifact hashes still pass verification. This stabilises the implementation for a separately approved fresh evaluation, not for an unqualified production release.

## Confirmed causes and corrections

**Review budgeting.** The old preflight added billed tokens to the next request's UTF-8 bytes plus 1,024. It treated a conservative byte bound as a token estimate and rejected every real candidate. Requests also repeated claim wrappers and product wording. The new shared budget helper uses the configured GPT-4.1 family's `o200k_base` tokenizer over the complete request, including its JSON schema, then reserves **25% extra plus 512 framing tokens**. Unknown model encodings retain the conservative byte fallback. No input or output cap was increased.

The pure-JavaScript tokenizer is pinned as `js-tiktoken@1.0.21`, with one small transitive dependency. Its model mapping follows [OpenAI's tokenizer implementation](https://github.com/openai/tiktoken/blob/main/tiktoken/model.py). It runs locally, without a provider token-count request or a paid service.

Review and repair inputs compact claim objects into confidence/text/source tuples and deduplicate repeated long strings using references. They retain all content strings, confidence labels and non-empty attribution URLs; they do not truncate recommendations or messages. Immutable owner statements provide product context, so protected overview/offerings are not copied again. The reviewer is told how to interpret the compact representation and that all text remains untrusted data.

Actual accumulated API usage is checked after each response. Missing usage fails closed. Every subsequent call must fit its estimated remaining input and actual remaining output allowance. Unused identification output allowance can support generation of the new experiment contract within the same whole-run cap. A repair explicitly reserves **650 output tokens for its required final review**, avoiding payment for an unreviewable repair.

**Claim semantics.** Verification now separates the content's purpose from its evidence status. Subject/predicate checks identify product assertions before applying buyer/action/target context; “if” does not exempt a later affirmative product clause. Buyer GDPR requirements, GDPR content tasks, experimental targets and the noun “offers” remain intact. Unsupported numeric goals are quality issues rather than fabricated historical facts, so they are rejected without destroying their text or inserting filler.

Prospect observations require explicit research placeholders when no prospect evidence exists. Exact publisher-attributed quotations remain publisher claims; they do not become independent proof. Founder-confirmed capabilities must match confirmed context and cannot establish performance/compliance verification. An “Independently verified” model label alone is insufficient: separate server-supplied evidence is required. No independent research capability was added.

Ambiguous non-promotional capability paraphrases on the semantic-gated path are reviewed against the immutable profile instead of being removed merely for using a verb. They are never automatically promoted to `Verified`. Strict verification remains available for manual edits; the server supplies the actual product name during edit checks. Existing exact quote binding, ownership checks and source validation remain intact.

## First experiment and quality gate

New initial generations must supply `firstExperiment`, a structured contract covering the narrow buyer/problem, prospect qualification, channel rationale, first action, a controllable activity quantity, explicit time/tool/zero-spend assumptions, a separate commercial learning outcome, continue/adjust/stop rules, and the strongest alternative with its tradeoff. The selected segment/channel must match the first-ranked visible recommendation. Assumptions are provisional, not invented founder facts.

The prompt requires the existing acquisition/playbook/week-one fields to carry the same substance. It explicitly challenges funnel optimisation without a relevant visitor source and asks self-service products to compare relevant distribution with high-touch selling. It does not prescribe a universal preferred channel. The contract is optional when reading historical report 1.1 JSON and is carried into founder refinement; no layout change or migration is needed.

Local checks run **before** semantic review. Known defects go directly to the single bounded section repair. A still-invalid patch is rejected before buying another review. A locally valid result must still pass semantic review; failed semantic review may trigger the one repair if unused, followed by a fresh review. Protected product identity/profile/attribution and unrelated sections cannot be replaced by the patch.

The existing m6.1 score thresholds are unchanged: every dimension at least 1; claim safety, outreach completeness and success criteria at 2; reported defects block publication. Checks now also cover unsupported outcome benchmarks, first-contract ranking/scope/resource inconsistencies, and an unjustified paid first campaign. LinkedIn messages are no longer required to have email subjects. Failure metadata records a controlled reason code, failing sections and whether another repair is feasible; successful repaired reports retain initial issues. No known defective report is silently published.

## Replay with genuine recorded usage

These are **offline request reservations**, not new reviewer token measurements. The inputs and accumulated usage come from the four genuine saved outputs. The production request builder and tokenizer are used by the tests.

| Recorded candidate | Actual input already consumed | Old rejected reservation | New total review reservation | Existing input cap |
| --- | ---: | ---: | ---: | ---: |
| Senja | 3,481 | 21,597 | 8,041 | 20,000 |
| Greensighter | 3,229 | 21,361 | 7,791 | 20,000 |
| FirstCustomers | 3,199 | 21,529 | 7,903 | 20,000 |
| Tally | 3,253 | 22,052 | 7,974 | 20,000 |

All four review requests fit. Tests also reconstruct both original API requests per site exactly, including their structured schemas, and check that the new conservative estimates exceed all eight observed input counts. String-preservation tests cover each full review payload. [Replay measurements](budget-replay.json) record the calculations.

The old candidates remain defective. In the new ordering their deterministic issues require repair before semantic review; a feasible review request is not an acceptance verdict. No repaired fixture is presented as real-model evidence.

## Verification

- **206 automated tests passed; 34 opt-in tests skipped.** The new Milestone 6.1 file contributes 32 offline tests, with an additional provider regression for claims inside the new experiment contract.
- TypeScript, ESLint and production build passed. The final build includes the tokenizer.
- Regressions cover actual four-site budgets and original API request sizes; unchanged historical evidence; conditional factual claims; buyer requirements/actions/targets; “offers” as a noun; prospect observations; publisher/founder/independent provenance; unsupported numeric goals; the recorded contradictory FirstCustomers webinar triggers; structured experiment requirements; bounded repair and safe rejection.
- Existing provider tests confirm semantic rejection still blocks publication, valid section repair preserves unrelated content and product attribution, known bad patches do not incur rereview, and exhausted output cannot buy an additional call.

## Remaining limits before release

1. **Fresh model quality remains unmeasured.** No new paid evaluation was authorised or run. The saved reports still fail; these tests validate plumbing and rejection behaviour, not improved fresh generation or evaluator accuracy.
2. **A review can fit while a repair cannot.** Repair output remains capped at 1,600 tokens, review at 650, with only one repair. At the recorded 8,000-output setting there is room for those stage maxima after the observed generation. At a 4,500-output setting, the same recorded usage leaves only **998/884/988/837 repair tokens** respectively after reserving final review. A large section patch may not fit; the system rejects rather than raises caps or regenerates the report.
3. **Estimates are not server-side billing guarantees.** The tokenizer margin was checked against all eight recorded calls, but provider framing can change. Actual over-budget or unmetered responses fail closed and prohibit subsequent work; already incurred provider usage cannot be undone. Very large requests and unknown encodings can still fail preflight.
4. **Semantic judgment remains necessary.** Bounded English grammar cannot prove arbitrary factual entailment, buyer differentiation, narrowness or natural-language plan consistency. Numeric-baseline wording alone does not prove a baseline; the semantic reviewer must bind it to supplied context. Manual edits do not receive an unsolicited paid review, and historical reports are not retroactively certified.

The next step is review of this change, then a separately approved single-attempt live evaluation with fresh outputs. Production release is not recommended on the basis of offline fixtures alone.
