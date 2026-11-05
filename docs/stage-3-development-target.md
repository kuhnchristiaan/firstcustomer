# Stage 3 development boundary

Continue only on the isolated feature worktree. The approved Stage 2B implementation, presentation improvements and original live smoke outputs are checkpointed before Stage 3 changes. Original main remains untouched.

The only migration/test target remains local PostgreSQL `firstcustomers_advisor_dev` on `127.0.0.1:55441`, role `firstcustomers_test`. Revalidate database/server identity before applying reviewed additive migration SQL. No production or Neon migration, deployment or EDUCERT access is authorized. Stage 3 testing uses local fixtures; prior live-smoke approval does not authorize another paid call.

Planned persistence separates immutable strategy from successive seven-day plans. Existing strategies/tasks require a compatibility backfill into their initial plan without modifying their content or completion state. Outcomes belong to a specific plan and retain nullable metrics (unknown distinct from zero), qualitative feedback and the actual completed-task snapshot. Reviews are immutable proposals tied to their source strategy/plan/version. Accepting a proposal must transactionally compare the expected current plan and activate its next plan; a changed buyer/channel requires explicit material-change approval. Keep prior results, proposals and accepted plans readable.

Do not impose a universal linear funnel across different cohorts. Completed tasks do not imply replies, activations or payments. Explanations must use the current accepted plan and actual recorded outcomes, while all recommendations retain founder budget/time constraints. Proposal generation alone must never change the active plan or strategy.

This document originally recorded the target before database changes. The Stage 3 migration was subsequently applied only to the isolated local test database; see `stage-3-migration-verification.json`. No production migration has been applied by this work.

Refinement before migration: keep each existing immutable AdvisorStrategy row as its accepted plan snapshot, with version as the plan sequence and a new strategyVersion defaulting to 1. Only a material buyer/channel change increments strategyVersion. Add one AdvisorWeeklyReview table for immutable outcomes and pending/accepted proposals. This needs no initial-plan backfill or task reassignment. Extend the existing operation-kind SQL check for bounded review calls. Existing report content and task completion remain untouched.
