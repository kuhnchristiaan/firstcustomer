# Offline quality-policy simplification

Implemented using saved genuine Senja traces. No new paid model calls.

## Changed

The semantic-review contract now separates `issues` (blocking) from optional nullable `advisories` (editorial suggestions). Advisory feedback is retained with the saved review but does not consume the single repair or cause a valid strategy to be rewritten. This makes explicit the existing rubric's distinction between score 0 (defective) and score 1 (usable with limitations).

All existing score thresholds remain unchanged: claim safety, outreach completeness and success criteria require 2; other dimensions require at least 1. Advisory feedback cannot excuse a failed score. Repetition that obscures the decision or makes execution unusable remains a blocking defect. All legacy `issues` remain blocking; historical model outputs are neither reclassified nor rewritten.

The shared quality gate also collapses repeated presentation-view copies of one deterministic source-field defect. Different source fields and different defect kinds are retained. This avoids feeding the model seven copies of one repair request while preserving every actual repair target.

Deterministic checks continue to own objective evidence, schema, resource arithmetic and structural completeness failures. Semantic review owns commercial judgment. Instructions discourage duplicating deterministic findings and reserve advisories for optional editorial improvement. No new validator, model call, orchestration layer, retry or repair loop was added.

## Compatibility and verification

The new advisory field is optional for historical records and nullable in strict provider output; installed SDK schema conversion is regression-tested. Accepted reports retain the review and any advisories. No database migration or historical-data rewrite is needed.

Ten new offline tests use the genuine accepted report and earlier genuine repetition review. They demonstrate advisory acceptance without repair/content changes, historical issue compatibility, unchanged critical score thresholds, blocking commercial failures, deterministic resource rejection despite advice, rejection of unusable repetition, deduplication and strict SDK schema compatibility. Policy fixtures are explicitly labelled; no edited fixture is presented as a new AI success.

Final suite: **296 passed, 51 opt-in skipped**. ESLint, standalone TypeScript, production build and diff checks passed. The unrelated advisor test allowance edit remains untouched.

## Limits

This verifies the policy and execution paths offline; it does not measure a new live completion rate or prove that future models will always classify feedback correctly. The existing blocking evidence checks and score-consistency rejection remain the backstop. No additional paid evaluation is proposed as part of this work.

Changes are local and uncommitted. No push, merge, deployment, production access or migration occurred.
