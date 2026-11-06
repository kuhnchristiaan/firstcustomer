# Senja claim-check and bounded-repair stabilization

## Diagnosis from genuine traces

The saved `docs/sol-review-budget-acceptance/2-output.txt` positions Senja while warning against repeating the owner's unverified testimonial-doubling claim. The checker matched the performance phrase without respecting its negation. It also treated a conditional manual-research versus inbound-discovery comparison as a product-performance assertion. Both triggered unnecessary repair of otherwise valid fields.

The genuine repair in `3-output.txt` completed using only 161 of 1,000 output tokens. Its positioning text used all 220 permitted characters and ended `course fit,`. The fault was not the output allowance: the patch schema admitted a dangling clause that the full contract subsequently rejected. The original candidate also contains an unfinished `unknowns.2` clause. That is a real defect; removing false positives must not silently accept it.

## Corrections

- Claim classification now recognizes the demonstrated scoped disclaimer without granting the rest of the sentence a free pass. The original text remains unchanged; masking is internal to classification. Tests reject affirmative promises alone and after warnings, including conflicting clauses. Conditional channel hypotheses are narrowly distinguished from product guarantees; a guarantee in a channel field still fails.
- A shared completeness rule is used by strategic validation and repair schemas. Strategic string patches retain original length/type constraints and now expose a JSON-Schema-compatible dangling-ending restriction to structured output. The same runtime restriction rejects the exact genuine incomplete repair before it can be applied.
- Completeness checking includes uncertainty fields, catching the saved unfinished resource assumption. It does not manufacture or truncate a replacement.
- Repair instructions ask for a short complete sentence, explicitly discourage filling maxLength, and require omitting secondary detail instead of cutting a clause. Only listed defective fields can change. Existing original enum/numeric bounds and evidence protection remain intact.

No model, token/cost allowance, semantic threshold, resource check or repair-loop count changed in this correction. GPT-6.1 Sol remains the report model. One bounded repair and mandatory semantic review remain the acceptance rules.

## Regression evidence

`tests/senja-repair-regression.test.ts` loads the actual saved original candidate, rejected repair, profile selection and sources. Ten offline regressions cover:

- Exact preservation of the original disclaimer and channel rationale.
- Unsupported affirmative promises alone, after warnings and inside a channel field.
- Rejection of the genuine incomplete repair in both patch and full-contract validation.
- A complete manually authored correction that changes only authorized fields and leaves its input untouched.
- The real candidate progressing through deterministic checks, a single correction of only the genuinely unfinished uncertainty clause, scripted semantic review and final acceptance.
- A complete version of the candidate going directly to semantic review and acceptance without repair or content changes.
- Rejection after a failing semantic review, with no second repair or bypass.

Manually authored corrections and scripted semantic reviews are test fixtures, **not new genuine AI outputs or commercial-quality approval**. Saved raw responses are unchanged. This proves the known engineering failure can be reproduced, prevented and passed through safely offline; it cannot guarantee future model quality or successful live acceptance.

## Verification

- Full offline suite: **282 passed, 51 opt-in skipped** (32 passing files).
- All ten new saved-trace regressions passed.
- ESLint passed.
- Production build passed, including its TypeScript phase.
- Standalone post-build TypeScript and diff checks passed.

No related failure remained in these checks. Database/paid/external opt-in tests remain skipped and are not claimed as newly passed. No database code or migration changed in this correction.

## Status

**The demonstrated false-positive and incomplete-repair acceptance mismatch are resolved in offline regression coverage.** Valid original reasoning is preserved; the saved genuinely incomplete uncertainty clause still requires correction. Failed semantic review still blocks publication. A new live Senja result has not been generated or claimed.

No paid calls, infrastructure operations, production access, migration, push, merge or deployment occurred. Changes remain local and uncommitted; stop for review.
