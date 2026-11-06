# FIRSTCUSTOMERS_RELEASE_READINESS

Historical audit snapshot: this report describes the pre-commit working tree. The subsequent local release-candidate checkpoint and fresh verification are recorded in `docs/stage-3-release-candidate.md`; statements below about uncommitted files describe the earlier audit state, not the later checkpoint.

Audit date: 5 November 2026. Scope: local release candidate and saved genuine AI evidence. **Recommendation: No-Go for deployment in the current state.** This is a release gate assessment, not a new implementation milestone.

## 1. Executive summary

**Confirmed:** The current working tree passes the default automated suite, isolated advisor database integration, TypeScript, ESLint and a local production build. Milestone 5 attribution protections, Milestone 6 initial-report implementation and the subsequent contract-reliability corrections are included in the branch ancestry. Stage 2B is committed. Stage 3 and its refinement exist locally but are uncommitted.

**Blocked:** No new paid calls were dispatched. Keeping the configured 12,000-output-token ceiling and configured $10/million output rate requires reserving $0.12 per review for output alone. Two reviews require at least $0.24 before input, exceeding the authorized $0.15 combined ceiling. The old requests reserved approximately $0.167 each including input. Historical actual spend cannot guarantee a new response's cost. I did not lower token settings, bypass reservations, enable the old three-call/$0.90 harness, or consume the authorization speculatively.

**Unverified:** The refined weekly prompt's real commercial behavior; successful live quality of the latest initial-report contract; production migration state, environment configuration, identity/email delivery and hosting duration support. Passing fixtures and compilation do not close these gates.

No deployment, push, merge, cherry-pick, production migration, provider infrastructure change, credential creation or EDUCERT access occurred. Audit changes are this report and its evidence JSON. Existing application source was not changed. Local fixture integration tests added synthetic records only.

## 2. Real AI acceptance scenarios A and B

Both scenarios are **BLOCKED BEFORE DISPATCH**, not failed model responses and not fixture successes. There are no complete new AI reviews to reproduce. No provider request IDs, new usage, model-resolution result or model latency exists. The complete genuine baseline reviews remain linked below.

The intended source is the same saved Senja profile, attributed sources, founder context and starting strategy in [Stage 2B evidence](docs/stage-2b-live-smoke/database-evidence.json), as used by the original Stage 3 harness. It describes three hours weekly, USD 0 acquisition budget, no previous acquisition effort, the buyer segment “Bootstrapped SaaS founders with happy paying users who are preparing a launch or sales-page refresh,” and permission-based Indie Hackers participation. Founder revenue context is distinct from the target buyer's existing paying users.

| Scenario | Required supplied outcomes | New live result |
| --- | --- | --- |
| A: qualified interest/pricing objections | 6 contacted; 2 replies; 2 qualified conversations; 0 activations; paying customers unknown; pricing objections | Not run: unchanged token ceilings cannot fit the shared reservation cap |
| B: silence | 15 contacted; 0 replies; 0 qualified conversations; 0 activations; 0 paying customers; targeting/delivery/message quality unverified | Not run: same blocker |

No test account or result record was created for a new paid evaluation. Existing isolated synthetic accounts were used only through fixture integration tests.

### What the genuine baseline actually demonstrates

**A — genuine original response:** [Complete readable review](docs/stage-3-live-acceptance/run-1/1-review.md), [original model output](docs/stage-3-live-acceptance/run-1/1-output.txt), [full provider response](docs/stage-3-live-acceptance/run-1/1-response.json).

It chose Adjust and preserved the buyer and channel. It identified qualified interest without activation or confirmed payment; kept paying customers unknown; proposed clarifying the two objections, investigating the activation gap and testing more precise replies. Its five tasks were 30, 30, 35, 35 and 20 minutes. The 150-minute total fits the 153-minute allocation ceiling for a 180-minute week. Weakness: offer/access verification and constraints recur across tasks, uncertainty, resources and success criteria. Actual prices and terms were absent in this seed, so a scoped check is legitimate; asking to independently re-establish supplied collection capabilities would not be.

**B — genuine original response:** [Complete readable review](docs/stage-3-live-acceptance/run-1/2-review.md), [original model output](docs/stage-3-live-acceptance/run-1/2-output.txt), [full provider response](docs/stage-3-live-acceptance/run-1/2-response.json).

It chose Adjust, retained buyer/channel and correctly investigated exposure, targeting, wording and response time rather than declaring absent demand. It invented no actual responses. Tasks were 20, 30, 15, 45 and 40 minutes. Weakness: a 20-minute audit of all 15 contacts asks for too much detail if records need investigation. A time-boxed representative subset would be more credible. Offer/access prerequisites and warnings recur. The five-contact reply experiment is concrete, though learning criteria remain provisional.

For either unchanged buyer/channel Adjust proposal, the current presentation helper renders **“Keep strategy — adjust execution”**. This is a deterministic UI label, not a changed AI decision or schema. Offline regression verifies the label without mutating the historical output. New live decision semantics remain untested.

## 3. Before-and-after comparison

“After” below means **confirmed instruction or UI change**, not observed new model behavior.

| Criterion | Genuine baseline | Current source / evidence limit |
| --- | --- | --- |
| Repetition | Repeated access, permission and offer warnings | Prompt places shared constraints once and repeats only action-specific safeguards. Actual reduction unverified |
| Commercial usefulness | A follows up pricing objections and activation gap; B diagnoses execution | Commercial/evidence instructions retained. No new output establishes improvement |
| Effort estimates | Both total 150 minutes; B's full-record audit is optimistic | Prompt estimates actual activity scope and asks for representative time-boxed subsets. No new estimates available |
| Context reuse | Existing walkthroughs may be reused, but preparation checks dominate | Known attributed and explicit founder-confirmed facts must be reused; recheck only missing/conflicting/uncertain/changed facts |
| Decision quality | Both appropriately Adjust execution, preserving buyer/channel | Enum and semantics unchanged; clearer display label verified offline |
| Evidence integrity | Zero/unknown distinguished; no payment inferred from interest or tasks | Strict nullable metrics, attribution IDs, cohort caution and safeguards retained in source/tests |
| Resource limits | USD 0; 150 of 180 minutes allocated | Same zero-budget and 85% allocation checks retained |

Identical totals are not treated as a defect by themselves. Each estimate must be justified by its activity. There is **no observed new-model regression or improvement** because no new response exists. Offline tests show no contract/label regression; they cannot demonstrate commercial quality or that required warnings have not been under-emphasized by the model.

The fixture flow is explicitly synthetic. It is not a substitute for either new genuine review.

## 4. Usage, latency and cost controls

| Run | Model | Input tokens | Output tokens (reasoning included) | Latency | Estimated API cost |
| --- | --- | --- | --- | --- | --- |
| New A | Configured gpt-6.1-sol; not called | 0 | 0 | N/A | $0 |
| New B | Configured gpt-6.1-sol; not called | 0 | 0 | N/A | $0 |
| Historical A, comparison only | gpt-6.1-sol | 3,055 | 1,846 (137 reasoning) | 38,276 ms | $0.026096 |
| Historical B, comparison only | gpt-6.1-sol | 3,049 | 1,785 (136 reasoning) | 33,385 ms | $0.025471 |

Historical combined estimated spend: **$0.051567**; not new expenditure. Their stored conservative upper estimates total $0.051570. Metrics include cache-write input accounting and are preserved in the original [A metrics](docs/stage-3-live-acceptance/run-1/1-metrics.json) and [B metrics](docs/stage-3-live-acceptance/run-1/2-metrics.json). These are recorded estimates, not independently reconciled provider invoices.

The blocker uses the application's configured conservative rate ($2.50/million input; $10/million output), not an independently verified current provider quote. The transport reserves UTF-8 request bytes plus 2,048 input allowance and the maximum output. It disables SDK retries, uses store:false and default service tier, and rejects incomplete/schema-invalid output without a weekly repair pipeline. Weekly calls retain medium reasoning and the 12,000 output ceiling.

The existing historical harness authorizes three calls under a different $0.90 gate. It was deliberately not enabled under this two-call/$0.15 authorization. No credentials were read for a paid dispatch or recorded in audit artifacts.

To unblock: approve either a narrowly specified test-only reduced output ceiling with an offline two-request reservation preflight, or a higher shared allowance covering both exact request reservations. The existing per-operation ceiling is $0.30, so $0.60 is the maximum reservation envelope for two unchanged operations; it is not a prediction of actual cost. No such change or additional spending is performed by this audit.

## 5. Git branch and commit audit

Audited worktree: `firstcustomers-stage2a` in the dated visualization workspace. Branch: **codex/stage-3-weekly-advisor**. HEAD: **120a763**. The hashed source snapshot and starting status are in [audit evidence](docs/release-readiness-audit/evidence.json).

| Ref | Tip | Meaning |
| --- | --- | --- |
| main / locally recorded origin/main | df4415d | Initial-report intelligence baseline |
| codex/stage-2a-strategy-proof | 7ffd792 | Approved compact strategy proof and genuine outputs |
| codex/stage-2b-signed-in-advisor | 120a763 | Approved signed-in MVP plus genuine smoke/presentation changes |
| codex/stage-3-weekly-advisor | 120a763 | Same committed tip; Stage 3 is only in this working tree |

No remote fetch was performed. Remote-tracking refs establish the local view, not current remote server state.

Confirmed ancestry: `c7a272a` (Milestone 5) and `df4415d` (Milestone 6) are ancestors of HEAD. Main is an ancestor; four commits are ahead of locally recorded main:

1. `7ffd792`: approved Stage 2A evidence.
2. `e288285`: preserved original 83-file contract reliability work.
3. `d4c1aca`: signed-in advisor MVP.
4. `120a763`: approved real smoke and presentation improvements.

**Uncommitted before audit:** six tracked modifications: Prisma schema, fixture server, global CSS, advisor client, advisor provider and advisor service. Untracked Stage 3 files include the weekly API route, component, schema/service/presentation modules, weekly migration, local migration script, weekly unit/integration/browser/live harnesses and Stage 3 documentation/evidence. The current production build includes these files; a checkout of HEAD alone does not.

**Committed elsewhere but missing from this branch:** none found among local branches. Stage 2A/2B tips and all locally recorded main commits are already ancestors. No automatic merge or cherry-pick is required to recover them.

**Preserved original work:** all 83 original dirty files still match the preservation manifest in the main checkout byte-for-byte. Original working tree was not reset, overwritten or staged.

**Proposed versus implemented:** weekly scheduling/automatic reviews and third-party integrations remain out of scope. Stage 3 reviews are founder-triggered. Earlier documentation discussed an initial-plan backfill; the actual migration instead defaults strategyVersion to 1 on existing immutable plan rows. No separate backfill migration exists or is needed for that implemented design.

**Conflicts:** no competing local migration filename or divergent local branch implementation was found. Future main changes may conflict with advisor/report provider, Prisma schema, global CSS and shared quota/service changes. A current remote comparison remains unverified.

## 6. Milestone 5 and Milestone 6 status

### Milestone 5 — integrated implementation, regression coverage confirmed

Commit `c7a272a`, followed by quotation corrections in `c72408f`, is included. Inspection verified owner/demo block classification, owner-only evidence hydration, exact quote checks and downstream attribution. Product-attribution tests cover fabricated quotes, demonstration citations, editorial examples, ambiguous metadata and legitimate owner-product onboarding. Those tests pass in the default suite.

This establishes implemented safeguards, not perfect attribution for every future website.

### Milestone 6 — integrated fixes, live completion NOT established

Commit `df4415d` contains the compact initial acquisition contract, assembly, quality checks, bounded repair and commercial regressions. `e288285` adds versioned contract reliability, legacy assembly compatibility, resource/payment-path consistency and associated tests. Inspection of the actual analysis provider confirms it invokes the acquisition wire schema, strategy consistency, claim checks, quality gate and deterministic assembly; these are not unused README proposals.

The Senja regression in `tests/report-quality.test.ts` reproduces the original overbroad testimonial-word matching and confirms legitimate testimonial pain/action/metric text survives while an unsupported quantified promise is removed. Failed repairs are rejected rather than replaced by a repetitive fallback. Initial-report quality, milestone 6.1/6.3, provider and contract-reliability regressions pass.

**Important limit:** the saved Milestone 6.2 genuine Senja result failed acceptance after an incomplete repair; later genuine benchmark contracts also had commercial/consistency defects. The later version-2 fixes have offline fixture/replay coverage, but no saved successful live version-2 initial-report acceptance result was established. Stage 2A/2B advisor successes use a different contract and cannot certify the initial-report path.

Therefore “Milestone 6 implemented and integrated” is confirmed. “Milestone 6 commercially validated for release” is unverified. A separately approved initial-report acceptance exercise, or explicit release risk acceptance, is necessary; the current two weekly-call authorization does not authorize that exercise.

Founder-context refinement, report versioning, authentication, guest claiming and recovery code remain present. Inspection verified account-scoped immutable profile/strategy revisions, session/tenant enforcement, transactional guest claim ownership and reset/recovery components. Production identity/email behavior was not exercised.

## 7. Automated verification of the current working tree

| Check | Actual result in this audit |
| --- | --- |
| npm test | **266 passed, 51 skipped**, 30 passing / 17 skipped files |
| Advisor/PostgreSQL integration | **4 passed** across advisor-postgres and advisor-weekly-postgres |
| Weekly regression | Included in default suite: nullable outcomes, semantics/resources, refinement request and presentation |
| Initial-report regressions | Included: attribution, report-quality, milestone61/63, quality-provider, strategy-contract-reliability |
| npm run typecheck | Passed both before build and in the final serial post-build check (exit 0) |
| npm run lint | Passed, exit 0 |
| npm run build | Passed with Prisma client generation, Next 16.4.5 compilation, TypeScript, static generation and route tracing |
| git diff --check | Passed |
| Original dirty-file preservation | 83/83 hashes match |

Integration target was checked as `127.0.0.1:55441/firstcustomers_advisor_dev`, role firstcustomers_test. Only local synthetic data and fixture AI were used. The four tests exercise initial persistence plus Continue/Adjust/Reconsider weekly cycles, ownership, duplicate outcomes, stale approvals, material confirmation, accepted history and assistance without strategy mutation.

The initial sandboxed build failed with EPERM creating a .next output directory. A permission-enabled local rerun passed without source changes. This was a local filesystem restriction, not a diagnosed application compilation defect. The local dev server was stopped before building to avoid sharing .next output.

Skipped tests are opt-in paid, external or database tests; the default-suite total does not claim those passed. Older report/guest/tenant database suites require a different local cluster (55439), which was unavailable and not provisioned for this audit. Their unit coverage passed; fresh database integration for those paths remains unverified. Browser screenshots and prior browser acceptance are saved under docs/stage-3; no new browser run or screenshot is represented as part of this audit.

No substantive defect was repaired and no unrelated change was made to make checks pass.

## 8. Database, environment and production prerequisites

### Migration order and compatibility

Confirmed repository order:

1. 20261104000000_initial
2. 20261104010000_guest_reports
3. 20261104020000_strategy_revisions
4. 20261105030000_signed_in_advisor — committed
5. 20261105040000_weekly_advisor — **uncommitted**

All five are finished, not rolled back, on the inspected isolated local database. No production migration status was queried.

Weekly SQL adds AdvisorWeeklyReview, unique plan/submission/next-plan indexes, restrictive ownership FKs, strategyVersion with default 1, and extends the operation-kind check to review. It does not rewrite historical report content or task completion. Existing [local migration verification](docs/stage-3-migration-verification.json) records identical pre/post hashes for AnalysisRun, ProductProfile, AdvisorStrategy and AdvisorTask. The live local migration state was re-read in this audit; the migration itself was not rerun.

Inference: these additive changes support an application rollback while retaining rows. This is not proof of compatibility against an unseen production schema. Verify production migration history, direct FirstCustomers target identity, drift, backups and lock impact before applying anything. Use the normal deploy migration runner; never the hardcoded local verification script for production.

### Required configuration names

No secret values were printed or copied.

| Area | Names / readiness |
| --- | --- |
| Core DB/application/auth | DATABASE_URL; a verified DIRECT_DATABASE_URL or DATABASE_URL_UNPOOLED for migrations; APP_URL; NEON_AUTH_BASE_URL; NEON_AUTH_COOKIE_SECRET (32+ chars) |
| Existing report model | OPENAI_API_KEY; OPENAI_MODEL; MOCK_ANALYSIS=false in production; MAX_PAGES, MAX_CONTENT_CHARS, MAX_INPUT_TOKENS, MAX_OUTPUT_TOKENS |
| Shared account limits | MONTHLY_ANALYSIS_QUOTA; MAX_CONCURRENT_ANALYSES |
| Advisor activation | ADVISOR_ENABLED; ADVISOR_LIVE_ENABLED; ADVISOR_FIXTURES=false |
| Isolated advisor models | ADVISOR_STRATEGY_MODEL=gpt-6.1-sol; ADVISOR_PROFILE_MODEL and ADVISOR_ASSIST_MODEL=gpt-4.1-mini; independent of OPENAI_MODEL |
| Advisor spend | ADVISOR_DAILY_USD default 2; strategy/review ceiling $0.30, assistance $0.03; explicit model/rate allowlist fails closed |
| Existing refinement | STRATEGY_REFINEMENT_ENABLED; REFINEMENT_MAX_INPUT_TOKENS, REFINEMENT_MAX_OUTPUT_TOKENS, REFINEMENT_MAX_COST_USD; OPENAI_INPUT_USD_PER_MILLION / OPENAI_OUTPUT_USD_PER_MILLION where required |
| Guest experience, if enabled | GUEST_ANALYSIS_ENABLED and guest TTL/IP/attempt/concurrency/token/priced-model/rate/cost settings; GUEST_IP_HASH_SECRET; Turnstile public/private keys |
| Optional guest retention cleanup | CRON_SECRET (32+ chars) and an operator-configured schedule; no schedule exists in vercel.json |
| Local only | DEV_LAN_ORIGIN; fixture/audit test flags must not enable fixtures in production |

.env.example defaults advisor/live/refinement flags off and MOCK_ANALYSIS=true for local development. It cannot be copied unchanged to production. Core config rejects production mock analysis; advisor config rejects production fixtures. Production variable presence, correctness and provider model entitlement were **not verified**.

Prisma migration URL precedence is injected DATABASE_URL_UNPOOLED, DIRECT_DATABASE_URL, DATABASE_URL, then local environment fallbacks. Explicitly validate the resolved FirstCustomers target without exposing connection secrets. Never rely on an ambiguous shell/environment default.

### Runtime, access and operational controls

Confirmed in code:

- Neon session middleware protects dashboard/products/advisor pages; API domain services independently resolve authenticated tenant and owned product.
- Mutations require the configured origin and bounded JSON bodies (100 KB); weekly input is strict and metrics nullable.
- Row locking, request keys and unique indexes protect reservations/results; failed attempts retain budget reservation. Monthly account quota includes advisor, report and refinement attempts. Advisor starts are limited to three/minute and share configured account concurrency with reports/refinements.
- Daily advisor spending reservations are global across advisor accounts; this is not an all-product daily dollar cap for legacy reports/guests.
- API weekly route declares Node runtime/maxDuration 150 seconds; main advisor route 180 seconds; provider timeout 120 seconds; operation lease 170 seconds. Actual hosting plan support and timeout behavior are unverified.
- Weekly processing is synchronous and founder-triggered; no advisor background worker or scheduled weekly AI job is required. Expired operation state is handled on access/reservation.
- vercel.json specifies Next build, npm ci and fra1; it does not establish plan entitlements, production secrets or cron scheduling.
- Plans/results/history are account scoped. Proposals remain PROPOSED until explicit acceptance; stale expected plan IDs fail; material buyer/channel changes require explicit confirmation. Acceptance writes a new immutable plan and audit event. Explanations write operation output, not strategy decisions.
- Historical report schemas and legacy acquisition assembly are retained and regression-tested. Old reports are not silently re-certified or rewritten.

### Rollback

Before release, record the approved application commit, environment flags and actual migration state. Prefer disabling ADVISOR_LIVE_ENABLED/ADVISOR_ENABLED and rolling back application code while retaining additive data. Do not drop weekly tables/columns or reverse migrations that contain accepted plans/history. A database restore would lose post-release writes unless reconciled; restore/recovery must be reviewed against an actual backup. Neither production backup availability nor restoration was verified.

## 9. Risks

| Severity | Finding | Release implication |
| --- | --- | --- |
| Critical | None confirmed in inspected local code/tests | Not a claim that uninspected production is free of critical issues |
| High | Stage 3/refinement/migration are uncommitted | No reproducible committed Stage 3 release candidate |
| High | Refined real weekly A/B acceptance blocked by current authorization versus unchanged token reservation | Required new real behavior remains unverified |
| High | Latest initial-report contract lacks successful genuine live acceptance; earlier genuine runs failed | Cannot certify Milestone 6 quality from offline tests or advisor results |
| High | Production target, migration history, auth/environment/provider configuration unverified | No production readiness approval justified |
| Medium | Legacy guest/report/tenant database suites not rerun; production auth/recovery delivery not tested | Close relevant integration gaps before broad release |
| Medium | Hosting duration support, backup/restore and optional cleanup scheduling unverified | Operational prerequisites need operator evidence |
| Low | Baseline repetition and optimistic B audit estimate | Refinement addresses instructions; actual model improvement still needs observation |
| Low | Development target doc retains a historical “No migration has been applied” sentence | Read with later migration evidence; clarify when preparing the release commit |

## 10. Recommendation

**No-Go now.** The local implementation is a credible release candidate working tree, but not a committed, fully accepted release. Automated checks passed; neither a successful refined AI comparison nor production prerequisites have been established. There is no justification to merge or deploy automatically.

A Conditional Go can be reconsidered after a reviewed commit, controlled real weekly acceptance, explicit resolution/acceptance of the initial-report live-quality gap, and verified production preparation. None of those approvals is implied by this report.

## 11. Exact preparation sequence requiring approval

1. **Approve evaluation resolution:** either authorize a test-only lower output ceiling with a fully constructed two-request preflight under $0.15, or authorize the exact summed reservations for unchanged settings. Keep two calls maximum, no retries, isolated synthetic accounts, raw responses and explicit human commercial review. Do not use the old three-call harness unchanged.
2. **Approve the initial-report quality gate:** run a separately budgeted initial-report acceptance exercise on the integrated version-2 path, including Senja's fallback regression, or explicitly accept/document the unresolved release risk. No extra calls are authorized now.
3. **Approve a reviewed commit baseline:** inspect the six tracked modifications and every Stage 3 untracked source/test/migration file; verify ignored credentials/generated files stay excluded; reconcile the stale development-target sentence. Commit implementation/refinement with tests and migration, then audit/evidence as a distinct reviewable commit. Do not blindly stage all files in the original main worktree.
4. **Approve remote/integration preparation:** refresh refs, inspect main divergence and compare the exact new commit. If main remains df4415d, no cherry-picks are required: integrate the reviewed feature branch by PR into main after approval. If it diverged, review conflicts in Prisma, providers/services, quotas and shared UI before selecting a merge sequence. Do not cherry-pick ancestor M5/M6 commits or copy the old dirty tree over Stage 3.
5. **Approve staging/production inspection scope:** verify FirstCustomers project identity, environment names, direct DB target, five-migration history/drift, backups, auth origins/cookies/recovery delivery, configured models/rates/limits and hosting duration support. Report unknowns without touching EDUCERT or minting account keys.
6. **Approve migration only after evidence review:** keep advisor/live flags off; apply only missing migrations in the order above to the explicitly verified target; preserve data and record outcomes. Production migration requires its own explicit authorization.
7. **Approve deployment separately:** deploy the reviewed SHA, smoke-test authentication/report claiming/recovery/history and advisor approval flow, then enable approved advisor/live flags and budget with an operator rollback plan. Any paid smoke test requires its own spending authorization.

No command in this sequence has been executed against production. Stop for review and approval.
