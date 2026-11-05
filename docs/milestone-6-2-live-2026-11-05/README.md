# Milestone 6.2 — controlled live AI quality evaluation

**Recommendation: the engine needs another targeted fix before controlled production testing at the 4,500-output configuration.** Four genuine reports were generated, but **none was accepted**. Three bounded repairs exhausted their output allowance; Greensighter failed recommendation attribution before repair. **No semantic review executed**, so there are no genuine pipeline semantic scores to report.

## Controls and budget

- Executed **5 November 2026, approximately 09:22:20–09:24:21 Africa/Johannesburg**.
- Exactly **one initial analysis per site**, four total. No whole-analysis retries, additional experiments, founder refinements or favourable-result reruns.
- The user explicitly selected **all four at the existing 4,500-output default**. Every live call used the existing provider's supported limits parameter: **20,000 aggregate input / 4,500 aggregate output**. The repository default and `.env.example` specify 4,500; the local environment still specifies 8,000 and was **not edited**. The 8,000-output and guest configurations were not separately tested and cannot be certified by this run.
- Existing configured model and credentials: **`gpt-4.1-mini`**, resolved by the API to **`gpt-4.1-mini-2025-04-14`**. No model, prompt, schema, threshold, application limit or application code was changed before or after testing.
- Directly invoked the existing public crawler and complete `provider().analyze` pipeline. The observer forwarded the original SDK calls and did not return fixtures. No application persistence/service mutation path was invoked. Each site's selected evidence ultimately contained one homepage.
- An independent **US$0.20 spend guard** reserved conservatively before every API call. Final estimated cost: **$0.0327872**, with **$0 unresolved reservation**. The run did not need to stop for cost. No deployment, production-data changes, infrastructure changes, credential creation or EDUCERT access occurred.
- [Frozen application hashes](frozen-application.json) and [integrity checks](integrity.json) confirm unchanged application files, configuration files, thresholds and model settings. Environment file contents/hashes were not copied into the report. [Evidence hashes](evidence-sha256.json) preserve original outputs. A passing harness test means the outcome was captured, **not** that the analysis succeeded.

## Outcomes

| Site | Product identification | Initial deterministic checks | Repair attempts / result | Semantic review | Accepted | Latency | Actual input / output tokens | Estimated cost |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| Senja | Correct: testimonial collection/management | Failed: 3 quality findings, 2 claim sections | 1; incomplete at 507 output tokens | Not executed | No | 34.045 s | 6,843 / 3,850 | $0.0088972 |
| Greensighter | Correct: ticket-based UI/UX fulfilment into Figma with human review | Not reached: attribution coverage rejected first | 0; repair gate not reached | Not executed | No | 26.893 s | 3,730 / 3,056 | $0.0063816 |
| FirstCustomers | Correct: SaaS acquisition strategy, not illustrative onboarding analytics | Failed: 8 quality findings, 1 claim section | 1; incomplete at 907 output tokens | Not executed | No | 28.299 s | 6,902 / 3,850 | $0.0089208 |
| Tally | Correct: no-code form builder | Failed: 4 quality findings, 8 claim sections | 1; incomplete at 975 output tokens | Not executed | No | 31.948 s | 7,317 / 3,850 | $0.0085876 |
| **Total** | **4 correct** | **0 reached a successful final gate** | **3 attempted; 0 successful** | **0** | **0/4** | **121.185 s summed** | **24,792 / 14,606** | **$0.0327872** |

Repair was necessary for the three candidates entering the quality gate. Greensighter also needs attribution/content correction, but the live application rejected it before determining a repair. Its deterministic quality findings were inspected offline only and must not be represented as a live review outcome.

## The four actual generated reports

Each link contains the complete genuine generation, including rejected material. These are **not hand-authored replacements or accepted customer reports**. Raw model confidence labels and statement-ID citations remain visible as emitted; they do not establish accepted evidence or independent verification. Three additional bound-candidate copies show the application's ordinary product attribution; no partial repair was applied.

| Site | Complete original report | Raw JSON | Application-bound rejected candidate | API trace / diagnostics |
| --- | --- | --- | --- | --- |
| Senja | [Report](senja/generated-report.md) | [JSON](senja/initial-generated.json) | [Candidate](senja/candidate-report.md) | [Trace](senja/stages.json), [result](senja/result.json), [offline checks](senja/offline-validation.json), [incomplete repair](senja/incomplete-repair.txt) |
| Greensighter | [Report](greensighter/generated-report.md) | [JSON](greensighter/initial-generated.json) | Not reached: invalid recommendation basis | [Trace](greensighter/stages.json), [result](greensighter/result.json), [offline checks](greensighter/offline-validation.json) |
| FirstCustomers | [Report](firstcustomers/generated-report.md) | [JSON](firstcustomers/initial-generated.json) | [Candidate](firstcustomers/candidate-report.md) | [Trace](firstcustomers/stages.json), [result](firstcustomers/result.json), [offline checks](firstcustomers/offline-validation.json), [incomplete repair](firstcustomers/incomplete-repair.txt) |
| Tally | [Report](tally/generated-report.md) | [JSON](tally/initial-generated.json) | [Candidate](tally/candidate-report.md) | [Trace](tally/stages.json), [result](tally/result.json), [offline checks](tally/offline-validation.json), [incomplete repair](tally/incomplete-repair.txt) |

Each directory also contains its `product-profile.json`, exact selected public crawl evidence, exclusive attempt receipt and stage usage. [Machine-readable comparison](comparison.json) separates observed pipeline results from independent assessments.

## Real stage usage and expenditure

Pricing checked against the [official model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini): **$0.40/M uncached input, $0.10/M cached input, $1.60/M output**. Estimates use actual response usage, including tokens billed for incomplete repairs. Tally's product-identification call reported **1,664 cached input tokens**; all other calls reported zero. No cache writes were reported. Estimates exclude account-specific billing adjustments and are not invoices.

| Site | Stage | API status | Input | Cached input | Output | Stage latency | Estimated cost |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Senja | Product identification | completed | 2,022 | 0 | 381 | 5.190 s | $0.0014184 |
| Senja | Report generation | completed | 1,907 | 0 | 2,962 | 21.096 s | $0.0055020 |
| Senja | Targeted repair | incomplete | 2,914 | 0 | 507 | 4.321 s | $0.0019768 |
| Greensighter | Product identification | completed | 1,758 | 0 | 479 | 4.816 s | $0.0014696 |
| Greensighter | Report generation | completed | 1,972 | 0 | 2,577 | 17.294 s | $0.0049120 |
| FirstCustomers | Product identification | completed | 1,719 | 0 | 432 | 4.035 s | $0.0013788 |
| FirstCustomers | Report generation | completed | 1,932 | 0 | 2,511 | 16.853 s | $0.0047904 |
| FirstCustomers | Targeted repair | incomplete | 3,251 | 0 | 907 | 6.486 s | $0.0027516 |
| Tally | Product identification | completed | 1,795 | 1,664 | 353 | 3.467 s | $0.0007836 |
| Tally | Report generation | completed | 1,965 | 0 | 2,522 | 16.838 s | $0.0048212 |
| Tally | Targeted repair | incomplete | 3,557 | 0 | 975 | 6.901 s | $0.0029828 |
| **Total** | **11 genuine calls** | **8 complete, 3 incomplete** | **24,792** | **1,664** | **14,606** | **107.297 s** | **$0.0327872** |

Semantic review and rereview each incurred **zero calls and zero tokens**. Crawl times were 2.873/4.759/0.867/4.680 seconds respectively. Total processing times include crawl, token estimation, local validation and artifact recording; the evaluation test process took approximately **122.40 seconds**.

## Confirmed blockers

### 1. Repair cannot complete inside the observed 4,500-output allowance

The prior input-preflight blocker did not recur. The three repairs reached the real API with input usage still below the 20,000 aggregate cap. Their outputs were explicitly marked `incomplete`, with `incomplete_details.reason = max_output_tokens`.

| Site | Identification + generation output | Reserved final review | Remaining repair allowance | Entire sections requested for replacement |
| --- | ---: | ---: | ---: | --- |
| Senja | 3,343 | 650 | 507 | Value proposition, acquisition channels, outreach templates, first-ten playbook |
| FirstCustomers | 2,943 | 650 | 907 | Acquisition channels, outreach templates, first-ten playbook, four-week plan |
| Tally | 2,875 | 650 | 975 | Differentiators, geography, segments, positioning, acquisition channels, outreach templates, first-ten playbook, four-week plan |

The application reserves the final review correctly, but the repair contract requires complete replacement sections even when only individual fields failed. Those replacements did not finish within the actual remaining allowance. The resulting partial JSON was rejected as `quality_repair_invalid`; the reserved 650 tokens stayed unused because no valid repair existed to review. This is a repair-granularity/allocation problem demonstrated at 4,500, not justification to silently raise the cap.

### 2. Greensighter's attribution contract permits an invalid combination

Its generated `recommendationBasis` had five entries but only four distinct sections:

`segments, segments, acquisitionChannels, firstTenPlaybook, thirtyDayPlan`

`outreachTemplates` was missing. The unchanged `validateBasis` correctly raised **“Recommendation attribution is incomplete.”** This occurred before the quality gate, so the bounded repair mechanism never had an opportunity to correct it. A complete report was generated, but its provenance contract was invalid. The current array schema allows a combination that the subsequent server validator necessarily rejects.

### 3. Generation still violates the commercial contract

Structured first experiments were present in all four reports. Their presence did not ensure narrow buyers, coherent activity/outcome quantities, honest messages or appropriately differentiated distribution strategies. The independent assessment below identifies actual examples rather than relying on schema completion.

### 4. Some deterministic findings remain inaccurate or incomplete

For FirstCustomers, measurable counts of **downloads**, **sign-ups**, partnerships and active users were flagged as having “No observable success measure” because the word-based detector did not recognise their phrasing. Several are commercially weak or arbitrary, but that is a different defect. These false positives enlarge the repair surface.

Conversely, scope drift such as Tally's contract specifying five emails while week one specifies ten was not identified by the live deterministic findings. The semantic stage could have caught this inconsistency, but it never ran. Some claim flags also require judgment: “I noticed your work on [SaaS product]” contains an editable prospect placeholder, yet the observation rule requires a more specifically labelled research placeholder. No thresholds or checks were changed to resolve these findings during this evaluation.

## Independent commercial assessment

The following scores are **this assistant's independent inspection of the complete real generations**, not the engine's semantic-review output and not human market validation. The same ten-dimension m6.1 rubric is used: 0 defective; 1 limited/partially useful; 2 specific and decision-ready. Coherent message completeness is scored separately from factual safety.

**Pipeline semantic scores for every dimension below: N/A for all four sites, because no semantic review executed.** The numbers in this table are independently assessed scores only.

| Dimension | Senja | Greensighter | FirstCustomers | Tally |
| --- | ---: | ---: | ---: | ---: |
| Product relevance | 2 | 2 | 2 | 2 |
| Customer segment differentiation | 1 | 1 | 1 | 1 |
| Channel suitability | 1 | 1 | 1 | 0 |
| Action specificity | 1 | 2 | 2 | 1 |
| Commercial realism | 0 | 0 | 0 | 0 |
| Evidence and claim safety | 0 | 0 | 1 | 0 |
| Internal consistency | 0 | 0 | 0 | 0 |
| Repetition and filler | 1 | 1 | 1 | 1 |
| Outreach completeness | 2 | 2 | 2 | 2 |
| Success criteria | 0 | 0 | 0 | 0 |
| **Independent total / 20** | **8** | **9** | **10** | **7** |

### Senja

The product identification and attributed testimonial quotations are correct, and the former repetitive fallback sentence is absent. The selected “Marketing Managers” segment is plausible but lacks a narrow workflow trigger or clear reason to prioritise mid-market buyers over smaller reachable users.

The contract does make a small zero-spend assumption: two LinkedIn requests, 90 minutes, a free account and a tracking sheet. It contrasts content production with faster direct feedback. However, its continue rule requires **three replies from ten attempts**, “pro-rated” from two, while the visible playbook/week-one instructions use ten contacts. Those are not coherent observable criteria for the stated initial test. Positive replies or a trial alone do not establish paying-customer demand or product-market fit.

The messages are complete but repeat the publisher's “twice as many testimonials” claim as the sender's unqualified performance promise. One asserts that the sender noticed the recipient's marketing/sales work without a research placeholder. Content/email alternatives bring additional work and list-building assumptions. The first experiment is more explicit than before, but the surrounding report does not consistently honour it.

### Greensighter

Correctly understands ticket-based design fulfilment into Figma with senior human review. Five researched emails in an assumed 90-minute, zero-spend test are at least executable, and the prospect-identification method asks for publicly evidenced tool usage. Paid advertising is not its first recommendation.

However, segments one and two are largely divided by Jira/Linear versus Asana/ClickUp rather than distinct buying problems. Mid-to-large product teams are prioritised without addressing approval complexity. The contract's 20%/10% response thresholds are unsupported; five emails cannot establish product-market fit. The plan broadens into LinkedIn and content before defining a strong commercial learning decision.

The primary email asks a relevant workflow question, but the second template still fabricates **“I noticed your team uses Asana for design tasks.”** The report drifts from five emails to five–ten contacts and schedules several channels. These weaknesses remain even aside from the invalid attribution mapping. No repair or semantic judgment of this report was observed.

### FirstCustomers

Correctly targets SaaS founders and avoids the illustrative onboarding-analytics identification error. Its first experiment attracts prospects through outbound rather than assuming a pre-existing signup-funnel visitor stream. Ten LinkedIn requests in an assumed 90 minutes with zero direct spend are concrete; the alternative acknowledges content production/distribution costs.

“Solo Founders with Pre-Launch SaaS” is more specific than a generic SME, but the homepage targets founders with a product; the report does not establish why pre-launch founders are the strongest buyer. Other segments overlap with small SaaS teams and marketers. Its learning statement equates replies/meeting requests with product-market fit, and the three-reply threshold is unsupported. Later steps introduce a 20% active-user conversion target with no baseline and still do not connect signups to paying-customer validation.

The templates are coherent, but are generic and the research placeholder condition is insufficiently explicit for the current validator. This is the strongest of these four raw strategies by independent inspection, yet the numerical goals, overlapping decision branches and unpaid-user/customer distinction make it unsuitable for acceptance.

### Tally

Correctly identifies no-code forms and free usage. The first test is superficially small—five emails, 90 minutes, zero spend—but targets **“Small Business Owners”** across any industry without a specific form workflow. It assumes publicly obtainable email contacts and demonstrates no particular advantage over a relevant self-service use-case/distribution experiment.

The strongest alternative is generic blogging, not an evaluation of templates, relevant ecosystems or form-embedding distribution. The plan still uses high-touch demos and GDPR consultant partnerships for a self-service tool, without comparing buying friction, trust requirements or acquisition economics.

The contract specifies five emails while the playbook and week one specify ten. Two positive replies/signups is an arbitrary outcome threshold, and signups alone do not validate durable usage or a commercial path. The emails are complete but generic, use unqualified GDPR/security assurances and contain no prospect-specific workflow. Later weeks cascade into content and partnerships rather than respond carefully to why the first test worked or failed.

### Do the products receive genuinely different recommendations?

Only weakly. Senja and FirstCustomers start with LinkedIn; Greensighter and Tally start with email. Buyer names and product features change, but the repeated underlying pattern is manual outbound, then content/another outreach channel. The actual markets justify comparing different options, but the reports do not demonstrate that comparison well enough—particularly for Tally's self-service dynamics. No single channel is universally correct; the concern is the missing product-specific commercial argument, not the channel name alone.

## Recommendation and limits

The engine is **not ready for controlled production testing at the tested 4,500-output setting**. It prevented publication of defective reports, but acceptance was 0/4 and semantic review remained untested live.

The next authorised engineering work should target: (1) attribution coverage that is structurally valid or recoverable, (2) smaller repair scope that can complete within the unchanged budget, (3) accurate distinction between measurable outcomes and unjustified targets, and (4) coherence between the structured first experiment, visible plan and outreach facts. Do not infer that raising the output cap alone resolves the commercial problems or the Greensighter provenance failure.

This was a four-site, one-sample-per-site evaluation. It is not a statistical reliability estimate, a live test of the 8,000-output setting, or evidence of successful semantic-review calibration. **No implementation changes were made following the evaluation.** Any targeted fixes and subsequent fresh live evaluation require separate approval.
