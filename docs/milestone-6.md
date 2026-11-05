# Milestone 6: report intelligence and commercial quality

Implemented locally, 5 November 2026. No deployment, migration, provider resource change, credential change or historical-report rewrite was performed.

## Independent investigation and root cause

The supplied Senja PDF contains **36** occurrences of the fallback sentence, after normalising PDF whitespace. Greensighter contains **3**. These are server-authored replacements, not evidence that a model independently repeated that instruction 36 times.

The original `src/modules/strategy/claims.ts`:

1. Included `testimonial` as an unconditionally high-risk word. Ordinary Senja category language, customer pains and proposed collection activities consequently matched the claim filter.
2. Recursively applied the same sentence filter to every string, including outreach, activities, outcome measures and buying signals. Capability verbs also caused advice and hypotheses to be treated as product assertions.
3. Substituted `missingClaimText` whenever filtering emptied a field: “Ask the buyer about their current workflow and validate the relevant product capabilities before making a claim.” The replacement described a safety process and did not fulfil the field's purpose.
4. Applied this through `safeInitialReport` before persistence, and again in report, dashboard and progressive-report display paths. The refinement provider also used `verifyClaims` after critique. Thus a schema-valid report could become commercially defective after generation/review. Validating the original JSON did not protect the published text.
5. Had no initial commercial quality gate. String bounds, source URL validation, statement IDs and segment/week ordering did not check whether fields remained useful. Refinement critique was followed by destructive sanitisation without a substantive final check.

The prior Greensighter prompt required several experiments without a clear comparison of resources, distribution assets, buyer access, procurement or reversibility. A ranked list therefore did not demonstrate that its first item was executable. Its paid-LinkedIn-first recommendation lacked budget/economic context; content and webinars lacked an effort/distribution assessment. Its three groups overlapped heavily. “I noticed your team uses Jira/Asana” invented a prospect observation, even though the product's integration claims were attributed correctly.

This diagnosis was communicated before edits. The implementation fixes the process rather than blacklisting only the repeated sentence.

## Changes

### Claims and attribution

- Removing unsafe content now returns the removed text as empty plus removal actions; it never invents substantive replacement content. Generation treats any removal as a section failure, repairs or rejects, and never publishes the lossy sanitised candidate.
- Ordinary testimonial collection is no longer an endorsement claim. Actual customer-result, compliance, comparative and performance assertions remain restricted.
- Ordinary epistemic language such as “evidence supports the buyer choice” is distinguished from a product-support assertion. This prevents another demonstrated false positive while retaining checks on named-product capability statements.
- An evidence review must now bind its claimed wording to its quoted passage, as well as bind that passage to the supplied URL/content. A real quote about testimonials cannot support a fabricated Salesforce integration.
- Exact attributed owner quotations remain intact in the immutable product profile and bound overview/offerings. Owner wording is publisher evidence, not independently established performance. Commercial hypotheses remain inferred; activities are instructions to test a proposition rather than claims of historical success.
- The old display-only attribution repair remains for historical records. Historical storage is unchanged. Historical damage cannot be reconstructed from a generic replacement sentence; a fresh report is needed to recover lost substantive content. An older unsafe sentence may display empty after filtering, but no new report can be published in that state.

### Prompts and compatible schemas

`commercialInstructions` supplies shared requirements for generation, refinement, review and repair: product relevance, urgency, prospect discoverability, decision-maker access, purchasing difficulty, execution cost/time, audience/assets, reversibility, evidence, credible alternatives and missing context that might change ranking.

Initial reports still use the existing visible fields and schema versions 1.0/1.1. Experiment recommendations, steps and success metrics collectively carry target, channel, rationale, scope, resources, outcome and decision rule. Evidence/rationale fields carry segment tradeoffs and uncertainty. Week plans must branch on evidence rather than assume scaling. No rendering or PDF layout changes were made.

Optional `quality` metadata is added to report 1.1 and refinement intelligence 3.0. Old versions remain readable. The strict generation schemas remain bounded; no database migration is needed for JSON metadata. Founder edits discard the prior generated-text quality score so it cannot falsely certify changed content.

### Final quality gate

`src/modules/intelligence/quality.ts` implements:

1. Deterministic blockers for empty fields, internal instructions, repeated substantive text across sections, exact duplicate segment/channel names, incomplete messages, unsupported prospect observations, unobservable success measures and extreme outcome targets. Exact verified publisher quotations are excluded from filler detection. These are blockers, **not** the definition of commercial quality.
2. A strict semantic review with all ten rubric dimensions. Initial generation adds one bounded review call. Refinement incorporates this review into its existing critique, which evaluates the final proposed strategy. The server does not accept a model's standalone “pass” flag.
3. If either layer fails, collect the failing top-level sections and request a strict patch containing exactly those sections. Product identity, attributed profile, overview/offerings, schema version and recommendation-basis metadata are not editable by repair. Unrelated sections retain their values.
4. Reparse the patch, recheck evidence/claims, and independently reassess the complete repaired text. At most **one repair and one fresh review** are allowed. A low score with no actionable issues is an invalid review and fails closed.
5. Reject if still defective, malformed, over budget or unrepairable. Existing failed-analysis/revision handling preserves earlier reports and records usage. Initial failures identify an incomplete analysis and invite retry. No candidate is silently substituted as a successful final report.

Refinement's separate customer-facing assessment is also checked for deterministic defects and unsafe removals. Existing time, cost, phase-allocation and cross-reference validators remain publication requirements. Corrections to a channel that leave assessment references inconsistent are rejected rather than silently reconciled.

## Before and after examples

The “before” examples below are observations from the supplied PDFs. “After” examples are **hand-authored regression fixtures**, demonstrating accepted content and intended behaviour; they are not claimed to be fresh model outputs.

| Field | Before | After fixture |
| --- | --- | --- |
| Senja buyer pain | Generic capability-verification instruction | Course creator: learner feedback is scattered before launch. Agency director: client approvals delay publishing project proof. SaaS customer marketer: sales cannot find relevant customer proof. |
| Senja first action | LinkedIn Sales Navigator, demos, content and webinars without a justified starting sequence | Read an accessible creator group's rules; seek permission to discuss collecting learner feedback. Limit the test to three invitations, no spend and an explicitly assumed hour pending founder context. |
| Senja success/plan | “Generate 50 demo requests or trial signups”; later weeks scale campaigns | Count qualified conversations; continue only with confirmed urgency and an agreed next step. Otherwise change the pain or stop the batch. Later weeks depend on the previous evidence log. |
| Senja outreach | Safety fallback replacing substantive message content | “Hi [name], how do you collect learner feedback before your next course launch? I am exploring whether Senja fits this workflow. Would you discuss where the process gets stuck? No purchase expected.” |
| Greensighter priority | Paid LinkedIn advertising despite unknown budget/economics | Manually identify three product founders by public role; ask about design-ticket delays without assuming their software stack. |
| Greensighter alternatives | Content and webinars presented without resource assessment | Ads require confirmed budget, acquisition economics and a conversion path; webinars require production time and distribution. Revisit after conversations establish demand. |
| Greensighter buyers | Product teams, design teams and agile teams using PM tools, with substantial overlap | Founder with a UI backlog; agency delivery director handling delivery peaks; design operations lead allocating design-system support. Validate separate buying processes and authority. |
| Greensighter outreach | “I noticed your team uses Jira/Asana” | “Hi [name], do UI tickets ever wait for design capacity before a release? I am exploring Greensighter's fit for that workflow. If this is relevant, would you discuss a recent design handoff?” |

Greensighter's Jira/Linear/Asana/ClickUp-to-Figma and human-review description remains quoted owner evidence. No unqualified delivery guarantee is repeated in the sample outreach. Senja promotional claims belong in attributed evidence, not as invented conversion promises in messages.

## Evaluation rubric and scores

Each dimension scores 0 (defective), 1 (usable with explicit uncertainty/limitations), or 2 (specific and decision-ready). Publish only with every dimension at least 1, and claim safety, outreach completeness and success criteria at 2. Any reported issue also blocks publication until addressed. Scores are not market-validation probabilities.

The following are a **manual engineering assessment**, not independent live-model measurements. Automated transport tests use scripted scores to test orchestration; they do not prove semantic evaluator accuracy.

| Dimension | Senja PDF | Senja fixture | Greensighter PDF | Greensighter fixture |
| --- | ---: | ---: | ---: | ---: |
| Product relevance | 2 | 2 | 2 | 2 |
| Segment differentiation | 1 | 2 | 0 | 2 |
| Channel suitability | 0 | 1 | 0 | 1 |
| Action specificity | 0 | 2 | 1 | 2 |
| Commercial realism | 0 | 2 | 0 | 2 |
| Evidence and claim safety | 1 | 2 | 0 | 2 |
| Internal consistency | 0 | 2 | 0 | 2 |
| Repetition and filler | 0 | 2 | 1 | 2 |
| Outreach completeness | 0 | 2 | 0 | 2 |
| Success criteria | 0 | 2 | 0 | 2 |
| **Total / 20** | **4 — reject** | **19 — usable fixture** | **4 — reject** | **19 — usable fixture** |

The fixture channel score remains 1 because buyer access and actual founder resources are not established. Unknown demand is handled as a testable hypothesis, not fabricated evidence. FirstCustomers fixtures target SaaS founders and exclude the illustrative analytics product; ShiftRoster uses a local coffee-roaster partner conversation, demonstrating a different expected acquisition dynamic rather than a universally preferred channel.

## Usage and costs

Official pricing checked 5 November 2026: [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) lists **$0.40/M input tokens and $1.60/M output tokens**, excluding caching discounts. The configured model is preserved. Its documentation currently labels the model deprecated; availability and migration need a separate approved decision, not a silent model replacement here.

All stages record actual API `usage` when run, including token consumption preceding a rejection. Successful JSON quality metadata records stage-specific usage. Tests verify aggregation for malformed output, failed review/repair, and budget exhaustion. Test-supplied token counts are explicitly synthetic.

The previous implementation reserved one token per request byte, but kept all byte reservations even after actual usage was known. The new accounting releases a completed stage's byte reservation and uses its measured API input tokens instead. Each next request still reserves its UTF-8 byte count plus 1,024 overhead against the remaining **same aggregate token limit**. Output requests likewise cannot exceed the remaining total. Refinement keeps its prior 4/9 candidate and 5/9 critique maximum allocations; repair can use only remaining actual allowance. No token/cost caps were raised.

Measured local request sizes (not token counts), reproducible through `M6_MEASUREMENTS_DIR` in the provider tests:

| Initial fixture | Profile request bytes | Generation request bytes | Final review request bytes | Review output cap |
| --- | ---: | ---: | ---: | ---: |
| Senja | 4,595 | 8,308 | 16,248 | 650 |
| Greensighter | 4,864 | 8,528 | 16,654 | 650 |
| FirstCustomers | 4,934 | 8,671 | 16,947 | 650 |
| ShiftRoster | 4,644 | 8,372 | 16,588 | 650 |

The new review alone has a conservative input reservation of bytes + 1,024. At those reservation bounds and 650 output tokens, its cost is at most **$0.00795 for Senja** and **$0.00811 for Greensighter**. These are conservative stage cost estimates, **not measured extra invoices or typical token costs**. Changed generation prompts also affect usage; the unchanged aggregate cap is the reliable whole-run bound.

The measured refinement fixture has 13,999 candidate-request bytes and 25,033 critique-request bytes. Quality schema adds 1,257 bytes. System text grows from 1,558 to 3,130 candidate bytes and from 1,838 to 3,181 critique bytes: **4,172 additional input bytes** including quality schema. Conservatively treating these as tokens gives up to $0.00167 additional input cost; allowing 650 output tokens for score/findings gives about **$0.00271 incremental cost** for a no-repair refinement. There is no extra no-repair refinement call. This is an upper-bound estimate; real tokenisation/output distributions remain unmeasured.

Default whole-run bounds at these rates, including any allowed repair, remain:

- Signed-in initial report: 20,000 input / 4,500 output tokens = **$0.01520**.
- Guest initial report: 30,000 / 6,000 = **$0.02160**.
- Founder refinement: 38,000 / 9,000 = **$0.02960**.

Initial generation reserves 650 output tokens for review (2,950 generation tokens after a 900-token profile at the signed-in default). Review is capped at 650; a targeted patch at 1,600; rereview at 650, always subject to the remaining original budget. Some large or defective reports will exhaust the remaining budget and fail rather than spend more or publish weak content.

**Real model input/output token measurements and actual incremental mean/p95 costs are not available:** no paid evaluations were approved or run. The JSON files in `docs/milestone-6-measurements/` record measured local request bytes and explicitly identify mocked transport. Real Senja/Greensighter initial and founder-refined evaluations are the remaining validation step before production approval.

## Verification

- Regression coverage: initial and founder-refined Senja, Greensighter, FirstCustomers and ShiftRoster; unsupported performance/integration claims; filler; incomplete templates; fabricated prospect observations; invalid success measures; exaggerated targets; semantic product/segment/channel/consistency defects; section-only repair; immutable attribution; failure after one repair; usage aggregation and exhausted budgets.
- Entire `npm test` suite: **173 passed, 26 skipped** (20 passing files, 8 opt-in skipped files). `npm run typecheck`, `npm run lint`, `git diff --check`, and the production build passed.
- The first build encountered Windows `EPERM` creating `.next/server/app/api/guest`. The identical build succeeded outside the filesystem sandbox. No application workaround or infrastructure change was introduced.
- Opt-in paid live evaluations and isolated PostgreSQL integration suites were skipped. No production database or EDUCERT resource was accessed. No deployment was performed.

## Remaining limitations

Semantic review can misjudge a report; it uses the configured model rather than a separately validated evaluator. Deterministic checks are deliberately limited and cannot prove market fit, opportunity size or claim entailment for arbitrary paraphrases. Conservative claim checks can reject useful paraphrases, requiring an exact attributed quote or a testable hypothesis. Repair addresses top-level sections, not individual sentences, and complex cross-section changes may exceed the retry/token budget. Founder-edited reports lose their generated quality score and retain existing edit/approval validation; edits do not trigger a new paid semantic review. Historical reports are preserved, not retroactively certified or reconstructed. Live quality, latency, rejection rate and real cost distributions still require approved evaluations.
