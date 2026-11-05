# FirstCustomers v2: Stage 1 assessment and implementation plan

Assessment date: 5 November 2026. Scope: repository inspection and design only. Stage 2 requires owner approval. No application code, schema, environment, provider resources or existing reports were changed for this assessment.

## Recommendation

Keep the existing Next.js modular monolith, crawler, attributed product identification, Neon authentication and Prisma infrastructure. Add an advisor domain that owns one active strategy and a short execution plan. Keep historical report contracts and readers intact.

The current application already makes a focused acquisition decision internally, but expands it into a report and then offers a second, longer refinement. A shorter rendering alone would retain that cost and workflow. The new path should identify the product once, collect optional founder context, and generate the authoritative seven-day strategy directly. It should not generate nine report sections as an intermediate artifact.

No new runtime dependency, external service, queue, orchestration framework or recurring subscription is proposed.

## What the repository actually contains

This assessment uses the current working tree, including pre-existing uncommitted contract-reliability changes. Those changes have not been reverted, completed or approved by this document. The README describes an earlier baseline; implementation files are more current.

| Area | Evidence in the repository | Decision |
| --- | --- | --- |
| Application and navigation | `src/app/dashboard/page.tsx`, `src/app/products/[id]/page.tsx`, `components/workspace-shell.tsx`, `site-navigation.tsx` | Reuse shell, product ownership and navigation structure; change the default product experience to the advisor. |
| Visual identity | `src/app/globals.css`, local Inter/Instrument Sans fonts, `components/brand.tsx`, `components/ui/button.tsx` | Reuse warm paper, dark ink, lime/coral accents, controls and spacing. |
| Safe website extraction | `modules/website/safe-fetch.ts`, `extract.ts`, `classify-html.ts`, `document.ts` | Reuse unchanged: URL/network validation, pinned DNS, redirect/robots rules, bounded pages and attributed passages. |
| Product identification | `modules/analysis/provider.ts`, `modules/intelligence/product-profile.ts`, `attribution.ts` | Extract a callable identification step from the existing provider; retain owner passage IDs, server-hydrated quotations and identity checks. |
| Founder questionnaire | `components/progressive-report.tsx`, `modules/strategy/schema.ts`, `service.ts` | Reuse validation concepts and saved answers. Replace the long post-report form with three optional groups. |
| Authentication/ownership | `modules/auth/server.ts`, `tenant.ts`, `src/proxy.ts`, `lib/http.ts` | Reuse sessions, organization provisioning, scoped product reads, Origin checking, body limits and safe errors. |
| Persistence | `prisma/schema.prisma` and three existing migrations | Retain all existing tables and migration history; add execution-specific records. |
| AI/usage controls | Analysis/refinement providers, `analysis/token-budget.ts`, `usage/limits.ts`, guest admission | Reuse Responses structured outputs, disabled SDK retries, token accounting, leases, atomic reservation and quotas. Extend controls across all advisor operations. |
| Existing strategy intelligence | `intelligence/acquisition-contract.ts`, `strategy-consistency.ts`, `strategy/claims.ts` | Reuse product grounding, resource accounting, actual-SaaS monetization and commercial checks where applicable. Introduce a distinct advisor contract. |
| Reports and revisions | `components/report.tsx`, `progressive-report.tsx`, `strategy-presentation.tsx`, `StrategyRevision`, `StrategyApproval`, `ProductProfile` | Retain readers, edits, history and approvals for legacy records. Do not repurpose their output JSON as mutable execution state. |
| Guest flow | `modules/guest/*`, `/guest/report`, `/guest/claim`, guest API routes | Preserve existing guest reports and claim behavior. Extend guarded guest access/claiming for new advisor records. |

The current flow is URL → crawl → identify → generate/validate full report → optional founder questionnaire → generate refined strategy → approve/save. Founder context is stored on revisions, and `readRevisions` can retrieve the latest context across a product's analyses. It is not yet an independently saved onboarding profile. Completely skipped answers are currently rejected by `generateRevision`.

`StrategyRevision` supports versioned output and usage, but versions are scoped to an analysis. Approval events select a strategy; there is no product-level advisor strategy pointer, persistent task, weekly outcome or review model. The current dashboard shows products, report status, quota and a suggested next action, rather than an execution workspace.

## Proposed user experience

1. Enter a website URL. Reuse protected guest admission or the signed-in organization reservation. Start bounded extraction/identification; show truthful processing and failure states.
2. Show three short optional groups while analysis runs: stage; weekly hours and approximate monthly budget with currency; previous acquisition efforts. Accept zero hours/budget as distinct from skipped. Show the requested stage and effort options, with a small text field only for Other.
3. Prefill previously saved answers. Save context independently of generation, including an explicit skipped state. Map old channel/time answers conservatively; never map zero customers to a launch stage without evidence. Keep unmappable legacy answers as context, not invented selections.
4. Generate one strategy when identification and the optional context step are complete. All-skipped is valid. Display important assumptions, such as a provisional time allowance, as assumptions the founder can correct.
5. Open the advisor: current buyer/channel and brief reasoning; three to five tasks for seven days; success/adjust/reconsider evidence; a few important unknowns. Initial strategy and task instructions together target 250–450 words. Optional explanations are outside that reading budget.
6. Check tasks off and return later. A checkbox records an activity only. It never increments replies, qualified interest, activations, adoption or payments.

Proposed pages and components:

| Surface | Behavior |
| --- | --- |
| `/` and URL form | Update acquisition-advisor language and entry into focused onboarding. |
| `/onboarding/[id]` | Resume authorized analysis and saved questions; use a session-backed opaque ID for guests. |
| `/dashboard` | Product overview with current experiment and completion summary; no added charts. |
| `/products/[id]` | Advisor home for products with an activated advisor; existing products without one retain their report view and an explicit “Start advisor” action. |
| `/products/[id]/reports` | Preserve full report readers and analysis history; preserve existing `?run=` and `?draft=` deep links through explicit routing. |
| `/products/[id]/history` | Readable strategy decisions and plans; review details arrive in Stage 3. |
| Guest advisor view | Same concise initial plan, visibly temporary; account save uses the existing protected claim lifecycle. Ongoing execution requires a saved account. |

New focused components: `FounderOnboarding`, `CurrentStrategy`, `WeeklyPlan`, `TaskItem`, `AdvisorActionPanel`, then `ResultsForm`, `ReviewDecision` and `DecisionHistory` in Stage 3. Server components load authorized state; small client components handle questions, checkboxes and advisor requests. Read installed Next guides again as needed before code changes; route-handler and server/client guides were inspected during assessment.

Task help opens beside/below the selected task, without hiding the plan. Explain, help and draft actions call AI only after a click. Mark saved responses with their date and strategy version; show errors honestly. No canned text presented as generated advice. On mobile use a single column, accessible labels, large checkbox targets and visible save/error status.

## Minimum coherent persistence changes

Prefer a small additive advisor model over changing the meaning of old report records. The following are proposed logical records, not a migration already written or applied.

| Record | Minimum data and invariants | Stage |
| --- | --- | --- |
| `AdvisorWorkspace` | Unique product association after claim; optional guest-session association before claim; analysis reference; latest validated founder context with answered/skipped metadata and version; active strategy/plan references; concurrency version. Exactly one valid ownership path. | 2 |
| `AdvisorStrategy` | Workspace, monotonically increasing product/workspace version, immutable advisor JSON, product-analysis/context snapshots, predecessor, decision reason, operation reference, created/activated actor and timestamps. Unique `(workspaceId, version)`. | 2 |
| `WeeklyPlan` | Workspace, strategy, sequence, seven-day interval, immutable plan scope/success criteria, source operation, activation/supersession timestamps. Plan sequence is independent of strategy version. | 2 |
| `AdvisorTask` | Plan, stable ID/order, instructions, guidance context, activity measure, minutes and direct cost, completion state/timestamp, optimistic version. Unique `(planId, position)`. | 2 |
| `AdvisorOperation` | Workspace, operation kind, request/idempotency hash, input snapshot/version references, RUNNING/SUCCEEDED/FAILED status, lease, model/reasoning configuration, reserved ceiling, actual token usage/cost, validated response and safe error code. Saves explanations/help/drafts and accounts for failed calls too. | 2 |
| `WeeklyReview` | Workspace, plan and strategy references, immutable submitted metrics/feedback, submission key, operation reference, continue/adjust/reconsider assessment, proposed plan/strategy references, decision reason and confirmation actor/time. | 3 |

Also add an `AnalysisRun.kind` discriminator defaulting to the existing report type. New product-analysis runs store the attributed profile in a versioned output envelope; existing report JSON stays unchanged. All legacy consumers that assume every successful analysis is a report must filter by kind before parsing, including guest reads/claim, report pages, refinement, approval and history. `WebsiteSource` remains the authoritative stored source collection. An advisor need not create a fake nine-section `ProductProfile`; its product analysis comes from that run. Already attributed legacy profiles can be reused after validation, without another crawl or paid identification call.

New tables are justified by independent lifecycles: context can save before generation; a strategy can span several plans; a checkbox changes without rewriting AI output; explanations have usage and caching; outcomes remain immutable while proposals await approval. A JSON task array in a legacy report would lose these boundaries.

Account authorization must traverse workspace → product → verified organization for every record. Guest access uses the existing hashed cookie token, expiry and unclaimed-session checks. Parent-child references must be verified within the same workspace, never trusted from client IDs. Add SQL checks/composite constraints where needed to prevent cross-workspace pointers and negative metrics. Use Restrict rather than cascading away report/decision history.

Claiming an advisor must atomically attach the analysis, sources and workspace to the authenticated product, preserving their IDs and snapshots. For a product that already has an advisor, retain the incoming result as a proposal/history entry; do not overwrite its active strategy. Existing report claiming remains compatible. Guest expiry/cleanup must understand new dependent records and never remove claimed data.

Write reviewable additive migrations in their respective stages, test against a dedicated authorized FirstCustomers development target, and inspect generated SQL. Validate the target before any database operation. No production migration, infrastructure setup or provider resource operation is authorized here.

## AI contracts and model compatibility

Create `modules/advisor` with separate schemas, provider methods and persistence services. Do not feed its output through `assembleAcquisition` or the legacy nine-section validator.

The initial structured contract contains one buyer, rationale and buying trigger; one channel, concrete prospect-discovery method and a concise trade-off against alternatives; three to five ordered tasks with measurable activities and resource estimates; evidence to collect and continue/adjust/reconsider criteria; important unknowns with provenance. Include distinct definitions for replies, qualified interest, activation, repeated adoption and confirmed SaaS payment. Product-specific activation can be not applicable/unknown. Exclude automatic outreach drafts and long alternative strategies from the initial response.

Use the existing attributed evidence IDs and validate their membership and relevance. Preserve website claims versus verified facts, founder statements, hypotheses and unknowns. Unknown pricing requires offer verification, never an invented paid tier, volume paywall or consulting offer. Sum task time/cost against the founder's available resources; do not inherit the current contract's fixed zero-spend and 15–120-minute experiment scope as a universal founder limit. Very low or zero availability must produce feasible preparation/access tasks or explain the constraint, without pretending execution occurred.

Explanations/help/drafts return a separate response bound to strategy version, task where relevant, product/context snapshots and recorded outcome version. They have no strategy-write capability. Cache by those inputs and action; invalidate when inputs change. Reconsideration and weekly review return proposals, never active-strategy mutations.

Use concise-writing instructions and complete semantic fields. Apply large transport/body limits for abuse control, not tight per-clause caps; never slice generated prose. Validate complete reasoning, time/budget consistency and commercial specificity. Reuse applicable local checks, but do not require all legacy report fields or the multi-stage scalar repair pipeline. Start with one bounded generation, deterministic validation and a bounded commercial/evidence assessment before activation; reject unusable output with a recoverable state. Include all assessment calls in the operation ceiling. Tune the exact call count through separately approved evaluation, not implicit retries.

The installed `openai` dependency is 7.50.0 by package declaration; existing code uses `responses.create` and strict Zod output. [Official GPT-6.1 Sol documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol) lists Responses and structured outputs, with configurable reasoning effort. This is API-level compatibility, not proof that the proposed prompt/schema works in the production account.

The preserved [four-call benchmark](model-intelligence-benchmark-2026-11-05/README.md) records completed, schema-valid Sol responses and stronger commercial reasoning, but neither model produced acceptable first-attempt strategies. Sol responses took about 64–66 seconds; the current analysis SDK timeout is 50 seconds. The [offline contract follow-up](strategy-contract-reliability/README.md) addresses several defects but explicitly has no new live compatibility result. Neither artifact authorizes a model switch or another paid test.

Propose explicit model configuration per operation: initial strategy, weekly review and material revision use the separately approved reasoning-model candidate; explanations, task help and drafts use a separately configured economical model. Identification retains the existing configured model until separately justified. `OPENAI_MODEL` currently drives both analysis and refinement; do not change it globally. The repository default is `gpt-4.1-mini`; deployed configuration was not inspected.

Model-specific settings must cover reasoning budget, input/output token ceilings, timeout, maximum calls and matching pricing. Sol uses the current conservative UTF-8 token reservation fallback, rather than the recognized 4.1 tokenizer path; test estimates offline. Its reasoning tokens also consume output budget. Existing guest pricing is bound to `OPENAI_MODEL`, and the refinement ceiling defaults to $0.03, so these cannot simply be reused with a different model/large reasoning allowance.

Before each paid operation, atomically reserve the worst-case priced cost across all permitted calls, including applicable cache-write premiums; fail closed if rates or model identity do not match. Retain disabled SDK retries and bounded deadlines. Share organization/guest concurrency and request limits across analysis and advisor operations so endpoints cannot multiply allowance. Use existing usage buckets for a conservative global monetary reservation cap as well as per-account limits. Log IDs, configuration, usage and safe errors, not prompts, credentials or unnecessary founder feedback. Provider-reported usage can be absent after an interrupted call; keep its reservation charged conservatively and disclose unknown usage rather than recording zero cost.

## Weekly advisory loop: Stage 3 design

Record completed activities, prospects contacted, replies, meaningful/qualified conversations, trials/activations, adoption where relevant, confirmed paying customers, obstacles and qualitative feedback. Distinguish zero from unknown/not applicable. Use bounded nonnegative integers, finite resource amounts, reasonable text sizes and explicit metric definitions. Reject malformed/impossible values; do not impose a universal linear funnel because trials, purchases and conversations can originate from different cohorts/channels. Acknowledge reporting period and cohort before enforcing cross-metric relationships.

Persist the submission before requesting review. The AI uses actual results, prior reviews, current plan, founder context and evidence. Missing outcomes remain missing; elapsed time or checked tasks are not evidence of demand. Continue keeps strategy; adjust proposes execution changes; reconsider proposes a materially different buyer/channel. Generate the next seven-day plan against remaining resources and actual learning, not by relabeling the previous week.

Review proposals remain pending. Founder acceptance atomically activates the next plan, and any material buyer/channel/offer change requires explicit confirmation of the proposed diff and reason. Compare expected active strategy and plan versions inside the transaction; reject stale approval. Changing the plan does not necessarily create a new strategy version. Preserve prior plan tasks, reviews, rejected proposals and decision reasons in history. Initial activation is an explicit “Use this plan” action; explanation buttons cannot activate anything.

## Controlled implementation and verification

1. After Stage 1 approval: add advisor contracts, pure validators and feature flag; keep legacy readers and routes working. Write Stage 2 migration SQL for review. Define price-matched operation policies without changing production defaults.
2. Separate reusable identification from report generation; implement kind-aware analysis reads and guest claim/cleanup compatibility. Add independent context save/resume and legacy-context import.
3. Add authorized strategy activation, plan/task persistence, optimistic updates, idempotent operations and quotas. Build focused onboarding and responsive advisor surfaces using existing styling.
4. Add actual generated/saved explanations, task guidance and outreach drafts. Validate evidence and ensure those services cannot write strategies. Complete Stage 2 flow before starting results/reviews.
5. Stage 2 demonstration: local fixture transport first, URL → identification → optional questions → concise strategy → activation → checkbox → reload/sign-in return → generated assistance. Fixtures must be visibly labeled. A genuinely live AI demonstration requires separate paid-call approval; do not describe a mocked response as a live result.
6. After Stage 2 verification: add Stage 3 migration, result submission, review proposals, next-plan activation and strategy-change confirmation/history. Test a real founder scenario using only that founder's supplied facts and actual recorded outcomes; Senja/Tally benchmark examples are product fixtures, not real founder outcome evidence.

Meaningful tests: cross-tenant/guest denial on every new endpoint; all-skipped onboarding and no repeated questions; duplicate/concurrent generation; stale activation and checkbox writes; failed/missing usage; exact budget reservations; malicious website instructions and unsupported capabilities/pricing; resource sums; no metric changes from task completion; no strategy changes from assistance; review evidence, proposal confirmation and history preservation. Migration compatibility tests must cover legacy report/profile/refinement and deep links, new analysis kinds, guest claim into existing products and cleanup.

Run typecheck, lint, unit/service tests and build after implementation. Use existing Playwright/axe setup for desktop and mobile, keyboard operation, save failures and reload persistence. Apply migrations only to an approved nonproduction FirstCustomers target. Production deployment and production schema changes remain separate approvals. No paid benchmark is included in Stage 2 approval.

## Risks and release gates

- **Existing working tree:** contract-reliability work is uncommitted. Establish the accepted baseline before implementation; preserve benchmark and historical artifacts.
- **Contract coupling:** report, guest, claim and refinement consumers currently assume report-shaped analysis output. Kind filtering and regression coverage are required before enabling the new path.
- **Authorization/claiming:** guest-to-account transfer and active-strategy selection must be atomic. Product IDs alone are not authorization.
- **Latency/cost:** reasoning-model calls may exceed current timeout and monetary defaults. Validate exact policies and hosting duration before live use; do not enlarge budgets silently or add unawaited background work.
- **Intelligence quality:** current heuristics cannot establish demand or factual entailment alone. Model/schema success is insufficient; review product accuracy, buyer access, buying trigger, practical scope and evidence integrity.
- **Schema rollback:** a feature flag can return users to legacy pages while preserving all new records. Do not drop tables or rewrite past strategies as rollback.
- **Scope:** no Telegram/CRM, autonomous outreach, scraping prospects, ad execution, attribution analytics, PDFs, gamification or multi-agent system.

Assessment validation was source inspection and reading saved evaluation artifacts, not a fresh runtime acceptance test. No test suite, dev server, database connection, paid API call or deployment was run during Stage 1. No secrets were read or printed. No EDUCERT resources were accessed.

Approval requested: proceed with Stage 2 using this additive advisor architecture, including implementation and reviewable migration files. This does not approve production migration/deployment, a production model replacement, or paid model evaluation. Stage 3 begins only after Stage 2 verification.
