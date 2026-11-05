# Milestone 6.3 — strategy coherence and bounded repair

Implemented 5 November 2026. **No new paid evaluation has run.** The changes are ready for another separately approved controlled live evaluation, not a production release recommendation. Offline transport successes are scripted regression tests, not evidence that a real model now produces commercially useful reports reliably.

## Root causes and architecture decision

The inspected path was `website/document` → `analysis/provider` product selection/hydration → generation → `product-profile.validateBasis` → evidence binding → `quality.qualityGate` → `analysis/execute` publication transaction. Founder refinement separately generates a candidate, critiques it, checks claims, invokes the shared quality gate and validates the final strategy before its service persists it. Historical rendering uses the existing report schemas and safe display copies.

The genuine [Milestone 6.2 evaluation](../milestone-6-2-live-2026-11-05/README.md) established these causes:

| Cause | Evidence | Consequence |
| --- | --- | --- |
| Independently generated overlapping decisions | Senja's contract starts with two connection requests, but visible plans and decision thresholds use ten contacts. Tally's contract says five emails while week one says ten personalised emails. | Mirroring instructions do not make a single source of decisions. |
| Attribution array permits duplicate sections | Greensighter emits `segments` twice and omits `outreachTemplates`. | Array length five satisfies generation schema but distinct-coverage validation rejects it before the quality gate. |
| Generation consumes repair capacity | Actual identification/generation output: Senja 3,343; FirstCustomers 2,943; Tally 2,875. After reserving 650 for review, repair gets only 507/907/975. | All three full-section repair responses are genuinely incomplete with `max_output_tokens`. |
| Repair granularity mismatches defect size | Senja and FirstCustomers request four replacement sections; Tally requests eight. | A short factual or message defect triggers substantial duplicate generation. |
| Local checks confuse measurability with commercial meaning | Downloads/sign-ups/active users are missed by the old keyword list. Conversely, an arbitrary three-reply threshold can be measurable without supporting a buying decision. | Both false positives and commercially weak passes. |
| Plan consistency relies on narrow patterns | Tally's `10 personalized emails` bypasses the old count pattern. | Visible weekly work can contradict the primary experiment. |
| Commercial guidance competes with a verbose output contract | All four reports identify the product but still gravitate toward generic outbound/content and unsupported response thresholds. | Product identification is necessary but insufficient for useful acquisition strategy. |

I explained these findings before implementation. There is no evidence here that an 8,000-token configuration alone would solve commercial quality.

Two designs were considered before choosing:

1. A separate strategy call followed by an independent report-writing call makes strategy explicit, but repeats context and introduces another opportunity for audience/channel/threshold drift. With two reviews and repair inside 4,500 output tokens, it spends scarce output on presentation repetition. More calls also add latency.
2. **Chosen: replace the existing report-generation call with a compact strategy contract, then assemble presentation deterministically.** There is still one identification call and one strategy-generation call. All commercial decisions remain model-generated and reviewed. The server projects those decisions into the historical public report shape. This saves repeated narrative, reduces independent decisions and makes one field repair update its dependent views atomically. The trade-off is more regular presentation and dependence on a carefully tested assembler; live completion and quality remain unproven.

## Implementation

- `src/modules/intelligence/acquisition-contract.ts`: three ranked buyers with market, buyer, urgent workflow, access and trade-off; first-buyer rationale; self-service/sales-assisted motion; payment path; one primary experiment with founder-resource assumptions, controllable activities, commercial learning and continue/adjust/stop rules; two compared conditional alternatives; two complete messages; positioning and unknowns. There is no product-name-to-channel routing.
- `acquisition-strategy.ts`: deterministic projection into the existing report 1.1 format. Primary channel, acquisition steps, first playbook step and week-one work share the same source values. Later weeks use the same learning and decision branches, then the payment path; they do not generate unrelated quotas or campaigns. Alternative channels carry explicit conditions. Identity and offerings come from the hydrated, quoted profile rather than being regenerated.
- Attribution generation uses **five required object keys**, each constrained to actual owner statement IDs. Before persistence, the server validates those references and losslessly converts them to the existing array representation. It does not fill missing attribution, invent quotations or claim that product evidence proves demand. Semantic review must still assess whether a cited capability is relevant to a recommendation.
- `field-repair.ts` and the shared quality gate replace section substitution with required **flat scalar dot-path keys**. Every target must be a known editable leaf; at most twelve exact fields can be requested. The schema requires all requested keys and rejects extra keys. There are no add/remove operations, section replacements, evidence changes, identity changes or prototype paths. Numeric and string replacements must pass the complete original schema after application.
- Local and semantic findings must identify exact defective paths. A broad or unknown finding is rejected as unrepairable rather than granting permission to rewrite its section. Coordinated changes can name several exact fields. For initial reports, changes are applied to the contract, then all dependent report views are rebuilt, fully parsed, evidence-validated and checked again. The shared refinement gate also uses granular patches; its candidate/critique architecture and founder-context checks remain in place.
- The complete final contract and assembled text reach the semantic reviewer, with an explicit list of editable paths. Repeated text is compacted losslessly using references. All ten dimensions and acceptance thresholds remain unchanged. Local blockers are checked before paying for a review; an acceptable repair always receives a fresh review. There is still **at most one repair**.
- Observable-measure recognition now includes downloads, sign-ups, activation, active users and partnerships. An engagement measure does not automatically pass commercial quality: the contract must test buying evidence, and the reviewer must distinguish free usage from paying customers. Arbitrary numerical commercial thresholds and unsupported rate/cost benchmarks are blocked; writing “observed baseline” without validated evidence no longer escapes the check.
- Initial activity checks now recognise modifiers such as `personalized`/`qualified` and cover the first playbook step as well as the channel and first week. Prospect-specific assertions still require an explicit research/verified-observation placeholder; direct assertions such as “your team uses Jira” are checked even without “I noticed”. Genuine questions, buyer requirements and hypotheses remain permitted. Existing product/performance/compliance claim controls remain active.
- `reportV11Schema` adds an optional `acquisitionStrategy`. Existing 1.0 and 1.1 JSON remains readable. No migration or historical report rewrite is needed. The publication transaction is unchanged and is reached only after provider acceptance.

## Before and after

Actual rejected Greensighter generation:

```json
{"recommendationBasis":[
  {"section":"segments","statementIds":["..."]},
  {"section":"segments","statementIds":["..."]},
  {"section":"acquisitionChannels","statementIds":["..."]},
  {"section":"firstTenPlaybook","statementIds":["..."]},
  {"section":"thirtyDayPlan","statementIds":["..."]}
]}
```

New generation contract, structural illustration only (IDs must be real selected owner IDs):

```json
{"recommendationBasis":{
  "segments":["owner-capability"],
  "acquisitionChannels":["owner-capability"],
  "outreachTemplates":["owner-capability"],
  "firstTenPlaybook":["owner-capability"],
  "thirtyDayPlan":["owner-capability"]
}}
```

Previously, repairing one message requested the entire `outreachTemplates` array and sometimes several other report sections. Now a repair response can be:

```json
{"messages.0.body":"Hi [name], how do you collect learner feedback before your next course launch? I am exploring whether this workflow is worth improving. Would you share where your current process gets stuck?"}
```

That example is hand-authored to illustrate the format, not a live result. If scope and action must change together, both `firstExperiment.activityTarget.quantity` and `firstExperiment.firstAction` are required patch keys. Changing them rebuilds the channel, playbook and weekly plan together. Omitting either requested key rejects the patch. An unexpected `businessName`, whole `messages` array or attribution edit rejects the entire response.

## Output budget and cost implications

The defaults remain **20,000 aggregate input / 4,500 aggregate output**. No environment configuration, model selection or pricing setting was changed.

| Stage | Planned maximum output | Notes |
| --- | ---: | --- |
| Product identification | 600 | Original genuine usage was 381/479/432/353. Quotations are supplied by the server. |
| Compact acquisition strategy | 2,000 | No AI-written duplicate public report. Can be lower under a smaller caller cap. |
| Initial semantic review | 650 | Skipped when deterministic/claim blockers already require repair. |
| One granular repair after initial review | 600 at preceding ceilings | Actual request may use up to 700 if earlier stages leave headroom; always reserves the final 650. |
| Final semantic review after repair | 650 | Mandatory for repaired candidates. |
| **Worst-case total** | **4,500** | No second repair, full-analysis retry or silent limit increase. |

Without repair, maximum planned output is 3,250. If a local defect bypasses the first semantic review, the repair can use up to 700 while preserving the final review. Genuine usage replaces reservations after each call. Input preflight still counts the complete request and structured schema using the existing tokenizer reservation; aggregate actual usage is still checked and charged on rejection.

[Offline size projections](budget-projection.json) retain the old reports' relevant decision text and defects, without inventing successful new reports. Their lexical token sizes are 882/1,007/941/937 compared with **actual API output** of 2,962/2,577/2,511/2,522 for the old full reports. These are different measurements, not promised savings: the projections omit old duplicate presentation but do not supply all new required reasoning. A compact schema can still take more than 2,000 tokens to complete on a difficult product; that must be measured live, not assumed from these numbers.

The transport regression explicitly exercises 600 + 2,000 + 650 + 600 + 650 = 4,500 and reaches final review. It also tests incomplete repair accounting and rejection. This proves bounded orchestration and review reachability under scripted responses, not live quality or live reliability. No new API expenditure was incurred.

## Verification

Final verification on the completed implementation:

| Check | Result |
| --- | --- |
| `npm test` | **232 passed; 42 skipped** (23 passing files, 11 opt-in files skipped) |
| `npm run typecheck` | Passed, run serially after the final build |
| `npm run lint` | Passed |
| `npm run build` | Passed: Prisma client generation and Next.js production compilation/static generation |
| `git diff --check` | Passed |
| Original Milestone 6.2 evidence hashes | All 30 original files unchanged |
| New paid evaluations | None |

The test suite intentionally leaves paid, database and external integration tests opt-in. No infrastructure test was enabled. The initial sandboxed build could not create a `.next` directory; the permitted local build passed with filesystem execution permission. A parallel standalone type check encountered generated type files being recreated by Next.js; the final serial type check passed. Neither required an application/configuration change.

Regression coverage includes the genuine Greensighter attribution failure, all three real incomplete repair traces and allowances, historical report parsing and original evidence hashes, observable measures versus arbitrary benchmarks, the Tally modified-count miss, prospect observation safety, coordinated scalar patches, immutable evidence, full reassembly, mandatory semantic review and rejection, actual default stage ceilings and failed-run non-publication with mocked persistence.

## Remaining limitations and next evaluation

- **Live model quality is unverified.** The new prompt may still produce generic targeting or a weak channel choice. The unchanged semantic rubric can reject it; deterministic assembly cannot manufacture commercial reasoning.
- Scalar repair deliberately cannot add/remove/reorder segments, invent missing evidence, or replace a fundamentally wrong strategy. It rejects broad defects rather than spending the remaining budget on a different whole analysis. More than twelve defective fields can also be unrepairable.
- Short field bounds encourage concise content; they do not permit silently truncating required content. Incomplete generation or repair is rejected with billed usage retained. If the new contract repeatedly fails to complete within 2,000, or meaningful repairs cannot fit the reserved capacity, report that evidence and propose a different contract/allocation or separately approved higher-budget tier instead of lowering standards.
- Numeric benchmark checks are deliberately conservative for initial reports with no independent market research. They do not establish whether a real founder-supplied baseline is statistically useful. Such context remains a matter for the refinement/semantic review path.
- Historical reports remain readable but are not retroactively approved. Attribution arrays in old data retain their original shape. No rejected candidate was promoted by these tests.
- Weekly presentation is more regular because it is derived. Its commercial substance must come from the primary contract and payment path. Usability of that presentation still needs independent review of genuine outputs.

Recommend the next **separately approved** evaluation use exactly one new initial analysis each for Senja, Greensighter, FirstCustomers and Tally at 20,000/4,500, with the existing model, unchanged thresholds, one repair maximum and an explicit spend ceiling. Save full compact contracts, assembled reports, patches, review scores and all actual usage, including failures. Independently check urgent buyer selection, accessible distribution, self-service versus assisted buying, honest messaging, buying outcomes and four-way differentiation. Do not deploy or recommend release based only on these offline tests.

No UI, PDF rendering, authentication, database infrastructure, production configuration or unrelated feature was changed. No deployment, credential creation, production-data mutation or EDUCERT access occurred.
