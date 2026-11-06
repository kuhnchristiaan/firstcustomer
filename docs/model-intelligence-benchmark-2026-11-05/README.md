# FirstCustomers model intelligence benchmark — 5 November 2026

**Recommendation: Option D for the current contract.** Sol made materially better commercial decisions in this small comparison, but neither model produced a commercially acceptable first-attempt strategy. Fix the demonstrated contract/compatibility problems before interpreting a model upgrade as a release solution. If those blockers are resolved, Sol is a credible candidate for **strategy generation only**; this experiment provides no evidence for using it throughout product identification or the full pipeline. No recommendation has been implemented.

Exactly four paid strategy-generation calls ran: Senja and Tally × the two requested models. No repair, regeneration, retry, semantic-grader call, database write or deployment. Total estimated API cost was **$0.051439**, against a **$0.75** ceiling. The conservative worst-case preflight reservation was $0.5777515. Original responses, readable contracts, usage and failures are retained.

## Four actual first-attempt outputs

| Product | Model | Complete readable original content | Structured contract | Original API response | Detailed scores / metrics |
| --- | --- | --- | --- | --- | --- |
| Senja | GPT-4.1 mini | [Strategy](senja/gpt-4.1-mini/strategy.md) | [JSON](senja/gpt-4.1-mini/strategy.json) | [Response](senja/gpt-4.1-mini/response.json) | [Assessment](senja/gpt-4.1-mini/assessment.json), [metrics](senja/gpt-4.1-mini/metrics.json) |
| Senja | GPT-6.1 Sol medium | [Strategy](senja/gpt-6.1-sol/strategy.md) | [JSON](senja/gpt-6.1-sol/strategy.json) | [Response](senja/gpt-6.1-sol/response.json) | [Assessment](senja/gpt-6.1-sol/assessment.json), [metrics](senja/gpt-6.1-sol/metrics.json) |
| Tally | GPT-4.1 mini | [Strategy](tally/gpt-4.1-mini/strategy.md) | [JSON](tally/gpt-4.1-mini/strategy.json) | [Response](tally/gpt-4.1-mini/response.json) | [Assessment](tally/gpt-4.1-mini/assessment.json), [metrics](tally/gpt-4.1-mini/metrics.json) |
| Tally | GPT-6.1 Sol medium | [Strategy](tally/gpt-6.1-sol/strategy.md) | [JSON](tally/gpt-6.1-sol/strategy.json) | [Response](tally/gpt-6.1-sol/response.json) | [Assessment](tally/gpt-6.1-sol/assessment.json), [metrics](tally/gpt-6.1-sol/metrics.json) |

These files preserve all returned content, including unfinished explanations. They are not rewritten or accepted customer reports. “Complete API response” and “schema-valid contract” do **not** establish that every strategic explanation is complete or usable.

## Fairness and controls

- Code baseline: commit `df4415d`, Milestone 6.3. Only an isolated opt-in test harness and benchmark artifacts were added. Application source, production model/configuration, environment files, thresholds and budgets stayed unchanged; see [integrity](integrity.json) and [application hashes](frozen-application.json).
- Captured each public homepage once on 5 November 2026 using the existing SSRF/robots-aware crawler: [Senja snapshot](senja-sources.json), [Tally snapshot](tally-sources.json). Existing genuine 6.2 owner profiles were revalidated against these fresh snapshots, including exact owner quotations: [Senja](senja-profile.json), [Tally](tally-profile.json). No new paid identification calls or manually invented capability statements.
- Both models received the exact same attributed product excerpts, strategic instructions, Milestone 6.3 JSON schema and unknown-founder assumptions for each product: [Senja request](senja-shared-request.json), [Tally request](tally-shared-request.json). Full homepage snapshots are retained for review; generation uses the same selected owner excerpts, not extra model-specific research. Evidence establishes publisher claims, not market demand or independent performance verification.
- [Protocol](protocol.json) records snapshot/profile/request hashes, prices and conservative reservations. Model IDs and account accessibility were checked through official documentation and read-only Models API retrieval before any paid call: [availability](model-availability.json). No model substitution.
- Both use Responses API, strict structured outputs, `store: false`, explicit Standard/default processing, no tools, no temperature/top-p parameters. Mini has a **6,000** output-token cap. Sol has **25,000**, including reasoning, and `reasoning: {effort: "medium"}`. Requested visible content and field lengths are identical. No 4,500 aggregate application output cap was applied to this isolated benchmark.
- SDK retries are disabled. Exclusive run/attempt receipts prevent accidental reruns. Before every call the harness reserves all requested output plus one token per UTF-8 request byte and 2,048 framing tokens, using the higher input/cache-write rate and no cache discount. Unknown usage would retain the reservation. [Ledger](ledger.json) ends with four calls, no unresolved cost reservation and expenditure below the ceiling.
- Call order and anonymous sample IDs were randomised. I assessed only the label-hidden content and saved [locked scores and reasons](blind-assessment.json) before opening the mapping or performance metadata. No generator self-rating or paid automated grader was used. The evaluator was this Codex assistant; the exact underlying Codex model ID is not exposed by the evaluation API. This is not independent human validation, and style/model-family bias cannot be excluded. The [predeclared rubric](rubric.md) and every output are preserved for your own assessment.
- One factual completeness clarification was made after unblinding, without changing any scores: Senja Mini's rationale reaches the character cap but ends with a complete clause. Lack of final punctuation alone does not prove truncation. The original assessment is preserved, with the correction recorded in [clarifications](assessment-clarifications.json). Its commercial blockers remain.

## Scores and commercial acceptance

The predeclared rule requires at least 80/100, at least 60% in each category, and no critical claim/access/execution defect. It is a benchmark rule, not a change to application thresholds. Concrete reasons, component scores and supporting excerpts are in the linked assessments.

| Product / model | A Product /15 | B Buyers /20 | C Acquisition /25 | D Actions /20 | E Commercial /10 | F Reliability /10 | Total /100 | Commercially acceptable |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Senja — Mini | 11 | 10 | 9 | 8 | 5 | 3 | **46** | No |
| Senja — Sol | 14 | 18 | 20 | 13 | 9 | 3 | **77** | No |
| Tally — Mini | 10 | 10 | 7 | 7 | 1 | 2 | **37** | No |
| Tally — Sol | 13 | 13 | 10 | 11 | 6 | 3 | **56** | No |

Sol improves by **31 points for Senja** and **19 for Tally**. Mean score rises from **41.5 to 66.5**, a **25-point** improvement (60.2% relative to the baseline score). These are qualitative judgments on one first attempt per cell, not a statistically reliable estimate of model performance or real acquisition outcomes.

## Side-by-side decisions

| Decision | Senja — Mini | Senja — Sol | Tally — Mini | Tally — Sol |
| --- | --- | --- | --- | --- |
| First buyer | Solo digital marketing freelancers; urgency/budgets asserted broadly | Paid cohort instructor with alumni and an upcoming enrolment deadline | Freelance graphic designers; broad urgency claim | Owner-led web agencies with an imminent client kickoff; solo designers overlap |
| First channel | LinkedIn group posts or invitations | Individually researched emails to published business addresses, using public course listings and instructor sites | Cold email from freelance-platform profiles | Researched contact through appropriate published business routes |
| Alternatives | Upwork outreach; Facebook groups | Creator-community request template; course-website designer referrals | LinkedIn InMail; bidding on graphic-design jobs | Community intake templates; agency workflow consultants |
| Scope / time | Ten mixed posts/invitations in 120 minutes | Eight researched invitations in **30 numeric minutes**, but resource prose says **three hours plus one hour for conversations** | Ten emails in 120 minutes; stop condition expands to twenty | Eight researched/qualified personalised invitations in **24 minutes** |
| Commercial decision | Interest and free-tier use; monthly-plan conversion assumed | Urgent deadline, meaningful activation, verified price and concrete buying step; confirmed payment required | Two interested replies or trial requests; volume-based paid upgrade assumed | Paid €49 setup pilot conditional on authorization; tests a new service offer rather than verified Tally SaaS monetisation |
| Principal blocker | Fabricated “noticed you manage multiple clients”; weak channel comparison and paid test | Better reasoning undermined by resource contradiction and unfinished critical fields | Unsupported volume-paywall assumption, arbitrary threshold, invented observation and poor product-led comparison | Wrong revenue experiment for the supplied self-service product, overlapping buyers, unrealistic time and unfinished fields |

**Senja:** Sol's specific cohort trigger and exclusions are useful: “Exclude first-cohort courses and contacts requiring guessed or private addresses.” It separates inaccessible prospects from rejected demand and requires payment confirmation. Mini's “Freelancers respond to relevant solutions posted in their groups” assumes the response that the experiment should test. Neither outreach sequence uses Senja's publisher multiplier as a sales guarantee, a positive result relative to earlier reports.

**Tally:** Mini labels the motion self-service but recommends email, InMail and job bids, without seriously evaluating template/activation distribution. Its proposed upgrade “after form volume” conflicts with supplied unlimited-free forms/submissions. Sol recognises this monetisation uncertainty and explicitly says the supplied claims do not verify a paid plan. However, it responds by proposing a new paid setup service. The €49 is clearly labelled an experimental price, not an invented existing Tally tariff; nevertheless, that is not demonstrated acquisition of paying SaaS customers and requires an authorized, economically viable offer. Relevant template/partner alternatives are present but secondary. Sol improves diagnosis more than it solves the actual Tally acquisition decision.

## Actual tokens, cost and latency

Prices verified from [Mini's model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Sol's model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [official pricing](https://developers.openai.com/api/docs/pricing): Mini $0.40/M input, $0.10/M cached input, $1.60/M output; Sol Standard $2/M input, $0.10/M cached input, $2.50/M cache writes and $10/M output. Estimates use actual response usage, not requested limits. Reasoning is already included in output tokens and is not charged twice. No cached reads were reported.

| Product / model | Actual input | Total output | Reasoning subset | Cache reads / writes | API latency | Estimated cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Senja — Mini | 1,163 | 774 | 0 | 0 / 0 | 9.180 s | $0.0017036 |
| Senja — Sol | 1,161 | 2,178 | 516 | 0 / 1,158 | 66.484 s | $0.0246810 |
| Tally — Mini | 1,221 | 800 | 0 | 0 / 0 | 8.479 s | $0.0017684 |
| Tally — Sol | 1,219 | 2,024 | 479 | 0 / 1,216 | 63.992 s | $0.0232860 |
| **Total** | **4,764** | **5,776** | **995** | **0 / 2,374** | **148.135 s summed** | **$0.0514390** |

Mini resolves to `gpt-4.1-mini-2025-04-14`; Sol resolves to `gpt-6.1-sol` with no dated version string supplied. Both responses report service tier `default`. Small input-token differences occur despite identical content; token counts need not match across model tokenizers. The live harness completed in approximately 149.48 seconds, excluding evidence preparation and assessment.

| Aggregate | Mini | Sol medium |
| --- | ---: | ---: |
| Complete API/schema-valid contracts | 2/2 | 2/2 |
| Contracts without an identified unfinished strategic field | 1/2 | 0/2 |
| Commercially acceptable strategies | 0/2 | 0/2 |
| Total generation cost | $0.003472 | $0.047967 |
| Cost per complete **structured contract** | $0.001736 | $0.0239835 |
| Cost per content-complete strategy, including failed attempts | $0.003472 | Not estimable: zero successes |
| Cost per commercially acceptable strategy | Not estimable: zero successes | Not estimable: zero successes |
| Mean latency | 8.8295 s | 65.238 s |

Sol costs **13.82×** as much (+1,281.5%) and takes **7.39×** as long (+638.9%) for these two cases. “No acceptable strategies” must not be reported as zero cost per acceptable strategy. [Machine-readable comparison](comparison.json) preserves all calculations.

## Model reasoning versus application defects

All four APIs returned `completed`, valid JSON and contracts passing the unchanged acquisition schema. None approached its configured output cap. Sol used only 2,024/2,178 total output tokens including reasoning, so this run does **not** support blaming an aggregate output-token ceiling for the defects.

1. **Contract-level explanation bounds:** both models reach the 220-character `firstBuyerWhy` cap. Tally Mini ends “validation demands is”; Sol Senja ends “Agency owners win instead if a”. Sol also returns unfinished price/learning/channel comparisons. Some bounds are reached with a complete sentence or clause, so hitting a cap alone is not proof of failure. Raw text and cap diagnostics are retained. These observations do not prove whether the model's generation behaviour, structured-output enforcement or another API-side mechanism caused the abrupt endings. The current contract did not reliably yield complete concise explanations.
2. **Application assembly incompatibility:** Tally Sol's `firstExperiment.channel` is valid under the acquisition contract's 200-character bound but exceeds the existing outreach template's 100-character channel bound. Deterministic assembly rejects `outreachTemplates.0.channel` and `.1.channel`. This is an application compatibility defect, not a reason to zero the model's content score. No automatic label shortening or repair was applied.
3. **Model-level resource inconsistency:** Sol Senja assigns 30 minutes but writes four hours; Tally assigns 24 minutes to eight personalised, qualified prospects. These are visible contract defects even before assembly. Sol Senja's assembled report triggers the existing insufficient-time check. The assembly result cannot rescue the contradictory contract.
4. **Local-check misses remain:** Mini's Tally report assembles with no deterministic findings despite “At least 2 recipients respond” and an unresearched “noticed your great design work”. Those phrasing variants evade the current numeric/observation checks. Mini Senja's omitted-subject “noticed you manage multiple clients” also passes the local diagnostic. The benchmark did not run the application semantic reviewer, so this is **not** evidence that the full publication gate would accept these reports. It is evidence that local keyword checks alone cannot certify them.
5. **Shared information ceiling:** no independently verified pricing, paid-tier boundaries, acquisition economics or demand research was supplied. A defensible strategy should expose and test those unknowns. It should not invent a product paywall or silently substitute a different service business. Neither model received extra information to solve this asymmetry.

Three reports assembled; one failed assembly. **None was published or passed through the application's complete semantic-review/repair pipeline.** That pipeline was intentionally excluded so the first-attempt model strategies could be assessed independently.

## Recommendation and next step

Select **Option D now**: neither model/contract combination is sufficient as delivered. Sol is substantially better at trigger-based buyers, objections, access qualification, uncertainty and distinguishing activation from payments, particularly for Senja. Its higher cost buys useful reasoning, but not a reliable deployable result in this benchmark. A model swap alone leaves presentation incompatibility and execution contradictions unresolved.

For a separately approved next step, propose targeted contract/validation work on complete concise explanations, compatible channel labels, resource accounting and the distinction between SaaS paid activation and new paid services. Then compare a fresh pair of outputs per product under the same blind rubric, preserving first failures. **Do not implement those changes or run further paid calls under this completed four-call approval.** If the blockers are fixed and gains repeat, Option B is more defensible than Option C; product identification was held fixed here, so no end-to-end Sol advantage was measured. Mini remains a useful cheap baseline, though its read-only model metadata reports a 14 January 2027 shutdown date and official documentation marks it deprecated.

Harness preparation/live capture passed; harness lint and type checking passed. Integrity confirms unchanged application and environment files. No production data, infrastructure, credentials, model configuration or customer-facing code was changed. No deployment, EDUCERT access or new paid infrastructure occurred.
