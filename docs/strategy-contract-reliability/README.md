# Strategy contract reliability — offline follow-up

Implemented 5 November 2026. **No paid calls, production model change or deployment.** This work removes confirmed technical defects and adds local commercial checks. It does not establish that either model now produces commercially acceptable strategies.

## Confirmed causes

The original four [benchmark contracts](../model-intelligence-benchmark-2026-11-05/README.md) were replayed unchanged before testing new fixtures.

- A single 220-character `firstBuyerWhy` had to explain the first buyer, its risks and when another buyer wins. Sol Senja ends “Agency owners win instead if a”; both Sol payment explanations are unfinished. These were completed API responses, not output-token-limit failures. Cap coincidence does not prove which generation/API mechanism caused the endings. Mini Senja's cap-length clause is complete, and the regression explicitly avoids treating it as truncated.
- The contract allowed a 200-character channel but outreach templates allowed 100. Sol Tally's valid channel could not assemble. Boundary testing also found a 220-character buyer description feeding a 200-character buyer-role field.
- The resource model held a single numeric estimate and unconstrained prose. Sol Senja said 30 minutes numerically and about four hours in prose; Sol Tally assigned 24 minutes to eight researched, personalised invitations. There was no phase accounting or reliable relationship between quantity and available time.
- A single payment-path string could invent a volume paywall or switch from selling the SaaS to a paid setup service. Activation, repeat adoption and actual paid conversion were not separately represented.
- Local checks missed omitted-subject “noticed…” observations, “2 recipients respond” thresholds, potentially paid alternative tools and near-identical creative-intake buyer groups.

## Changes

**Versioned contract.** New generation emits `contractVersion: "2"`. `firstBuyerWhy` has separate `advantage`, `risk` and `runnerUpWinsWhen` components. Channel reasoning separates the decision from its trade-off; alternative comparisons separate benefit and barrier. These components allow one complete clause each, rather than packing several decisions into 220 characters. Other short labels and single-purpose fields retain bounds; there was no blanket length increase. A dangling-clause check rejects known incomplete constructions and semantic review still assesses actual completeness.

**Compatible assembly.** A new primary channel has an 80-character label plus a separate description. Descriptions and reasoning appear intact in recommendations; labels feed display fields. Historical channel values are preserved by aligning the public outreach bound to the existing 200-character channel contract. The public buyer-role bound similarly accepts historical 220-character descriptions, while new buyer descriptions are bounded to 200. Maximum-length expansion tests exercise every string-bearing contract field together, plus minimum-length labels. No valid value is silently shortened.

**Structured resources.** The available experimental budget remains 15–120 minutes and direct spend remains zero. The planned total is:

`preparation + quantity × (research per activity + execution per activity) + responses`

Researched contacts reserve at least five research and two execution minutes each, ten preparation minutes and five response minutes. Access checks and self-service assets have separate execution floors, so renaming outreach cannot evade its workload. These are conservative planning floors, not observed performance benchmarks or guarantees. More complex work can need more time and must survive semantic review. Quantities contradicting the declared scope, duplicated prose time estimates, unconfirmed tools and known potentially paid dependencies are blocked. Paid conditional alternatives require an explicit verified access/budget condition.

The assembler renders the numeric breakdown consistently in the initial channel, playbook and all four weeks. The same experiment budget does **not** reset weekly; further work requires re-scoping. A coupled-repair regression corrects the research estimate and budget together, rebuilds every week and then requires semantic review. Phase minima are included when identifying dependent repairs, rather than discovering the budget problem only after fixing research time.

**Existing SaaS monetization.** `paymentPath.offerKind` is fixed to `Existing SaaS`. It separately records monetization status, pricing evidence IDs, the actual-offer verification step, activation, adoption and paid conversion. Unknown pricing requires verification before a payment test. Claimed website-supported pricing must cite relevant owner statements; unrelated capability IDs cannot stand in for pricing. Pricing provenance and offer kind are immutable in scalar repairs. Primary recommendations, messages and experiment actions cannot substitute a paid setup/consulting service. A separate unvalidated offer may remain an explicitly separate hypothesis in unknowns, without becoming the SaaS revenue experiment. No paid tier or price was added to product evidence.

**Validation and publication.** New wire-schema parsing precedes local commercial checks so a bounded scalar repair can address relational defects. The accepted contract is checked again before assembly, including pricing context, and complete report structure/evidence is validated after assembly. Source claim checks and consistency findings are collected together for the one permitted repair. All ten semantic quality dimensions and acceptance thresholds remain unchanged; passing local checks never replaces semantic review or publication checks.

Core files: `acquisition-contract.ts`, `acquisition-strategy.ts`, `strategy-consistency.ts`, the provider, report schemas and the existing claim/quality helpers. `acquisition-legacy.ts` and its diagnostic assembler preserve the prior contract. Historical report reading accepts old and new structural versions without applying today's commercial policy retroactively. Report version 1.1, attribution representation and database schema remain compatible; no stored report was rewritten.

## Offline regressions and verification

[Recorded regression findings](recorded-regressions.json) show the original four contracts remain legacy-readable and all four can now assemble diagnostically, including Sol Tally's full channel. They still have commercial defects and are not accepted as version-2 generation. This is a compatibility replay, not four newly successful model outputs.

The new tests cover original outputs from both models; complete versus unfinished cap-length clauses; maximum/minimum assembly bounds; phase sums and inherited weekly resources; realistic activity accounting; tools and conditional costs; invented observations; arbitrary outcome thresholds; buyer overlap; preserving explicit buying-process hypotheses; SaaS activation/adoption/payment separation; pricing provenance; immutable evidence; coupled scalar repair; and all original benchmark artifact hashes.

Final verification:

| Check | Result |
| --- | --- |
| Full automated suite | **249 passed, 44 skipped**; 24 passing files, 12 opt-in files skipped |
| New contract-reliability regressions | **16 passed**, including all four saved original benchmark cells |
| Coupled repair and semantic-review integration | Passed with scripted transport, no API call |
| TypeScript | Passed |
| Lint | Passed without warnings |
| Production build | Passed: local Prisma client generation and Next.js compilation/static generation |
| Diff whitespace check | Passed |
| Original benchmark artifact hashes | All 62 unchanged |
| New paid model calls | **0** |

Paid/database/infrastructure integration tests remain opt-in and were not enabled. Automated local acceptance of a synthetic contract is not an independent assessment of commercial quality or a successful live model output.

[Offline budget measurement](offline-budget.json) counts a **hand-authored transport fixture**, not live model usage. It fits under the unchanged 2,000-token strategy-stage allowance. Aggregate default input/output limits, model selection and environment settings are unchanged. A real model may use more tokens or fail a bounded repair; those failures must remain rejected rather than truncated or concealed.

## Model compatibility, limits and next benchmark

Both models' genuine original contracts remain readable. The version-2 wire schema converts through the installed OpenAI SDK to strict JSON Schema using the same supported object/array/string/number/enum types; no model-specific request parameters or production model selection changed. **No live version-2 compatibility or quality result is claimed** for Mini or Sol, and no fabricated fixture is labelled a model success. The completed benchmark harness remains pinned to its historical contract for reproducibility.

Local completeness, overlap, pricing-language and tool-cost checks are bounded heuristics. They cannot fully prove sentence meaning, buyer differentiation, current pricing/tool access or commercial demand. Explicit buying-process hypotheses are preserved for review, not treated as verified market facts. Numeric phase sums cannot prove the chosen time is sufficient for a complex conversation, and the strict repair cannot invent missing evidence or replace a fundamentally weak strategy. Independent commercial assessment remains necessary.

**Ready for a separately approved small controlled benchmark**, after offline checks pass. Reuse identical snapshots and founder assumptions across the two models; save first-attempt version-2 contracts, assembled reports and real usage. Review concise explanation completeness, realistic time/quantity, actual SaaS conversion and product-specific channel choices before recommending production use. Do not infer readiness from valid JSON or a passing synthetic transport test. No further paid run is authorised by this implementation task.

UI, PDF design, authentication, infrastructure, deployment configuration, production data and credentials were not changed. EDUCERT was not accessed.
