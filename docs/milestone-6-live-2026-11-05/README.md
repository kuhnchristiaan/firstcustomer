# Milestone 6 controlled live-model evaluation

**Recommendation: do not release this implementation to production yet.** Four real analyses generated complete report candidates, but **0/4 analyses succeeded**. All stopped at the quality-review input-budget preflight. No semantic reviewer call or targeted repair executed. Independently reading the actual candidates also revealed substantial commercial weaknesses, so removing the budget blocker alone would not establish readiness.

## Protocol and provenance

- Executed on 5 November 2026, approximately **08:25:13–08:26:51 Africa/Johannesburg**.
- Exactly one initial analysis per requested URL: Senja, the original Greensighter URL `https://ai.greensighter.com/`, FirstCustomers and Tally. No founder refinements and no whole-analysis retries.
- Called the existing `crawl` and `provider().analyze` functions directly. No database/service persistence layer, production API mutations or deployment. No EDUCERT access, credential creation or infrastructure changes.
- Used the existing configured **`gpt-4.1-mini`**, resolved by the API to **`gpt-4.1-mini-2025-04-14`**. Mock mode was already false. Existing effective limits were **20,000 aggregate input tokens / 8,000 aggregate output tokens**, five maximum crawl pages, and the existing content selection formula. Each site's selected context ultimately contained one homepage.
- Quality thresholds, prompts, application code, request timeouts and bounded repair logic were unchanged during this evaluation. Only an opt-in evaluation harness and local artifacts were added. The SDK observer forwarded every request to the original real SDK method; it did not supply fixtures or fabricated responses.
- Exclusive-create `attempt.json` receipts prevent an accidental second run for these artifacts. The provider already sets SDK retries to zero. The observer also enforces five maximum model calls, one report-generation stage and at most one repair stage.
- Complete real outputs, response IDs, resolved model names, actual API usage, exact stage inputs, public crawl evidence and implementation hashes are retained. The [evidence manifest](evidence-sha256.json) hashes the original artifacts. No headers, API keys or environment-file contents were saved.
- The harness's four passing test cases mean **four evaluations were recorded correctly**, not that four reports passed quality validation.

## Outcome

| Website | Genuine candidate generated | First candidate passes quality? | Repair required? | Repair executed | Final accepted | Total time | Estimated API cost |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| Senja | Yes | Not accepted; semantic review blocked | Yes, by offline checks | No | No | 25.399 s | $0.0059556 |
| Greensighter | Yes | Not accepted; semantic review blocked | Yes, by offline checks | No | No | 25.268 s | $0.0060372 |
| FirstCustomers | Yes | Not accepted; semantic review blocked | Yes, by offline claim checks | No | No | 20.791 s | $0.0058588 |
| Tally | Yes | Not accepted; semantic review blocked | Yes, by offline checks | No | No | 26.313 s | $0.0061220 |
| **Total** | **4** | **0 accepted** | **4 need changes** | **0** | **0** | **97.771 s summed** | **$0.0239736** |

“Repair required” is a read-only diagnosis of recorded candidates, not a claim that the application attempted repair. The quality gate calls its semantic reviewer before gathering deterministic and claim issues; here that first review request failed its local preflight. Thus **the model's quality rubric results are unavailable**, rather than zero or passing. All `quality_failed` outcomes were local application rejections, not provider refusals, malformed responses, timeouts or semantic-review verdicts.

## Complete review artifacts

These are the actual model-generated candidates, with the application's normal immutable attribution binding. They are **rejected candidates, never published reports**. No hand-authored content replaces their recommendations. Since no repair ran, each site's first and final candidate are identical.

| Site | Complete readable candidate | Complete JSON | Stage trace and actual model responses | Result and offline validation |
| --- | --- | --- | --- | --- |
| Senja | [Report](senja/candidate-report.md) | [JSON](senja/first-candidate.json) | [Trace](senja/stages.json) | [Result](senja/result.json), [validation](senja/offline-validation.json) |
| Greensighter | [Report](greensighter/candidate-report.md) | [JSON](greensighter/first-candidate.json) | [Trace](greensighter/stages.json) | [Result](greensighter/result.json), [validation](greensighter/offline-validation.json) |
| FirstCustomers | [Report](firstcustomers/candidate-report.md) | [JSON](firstcustomers/first-candidate.json) | [Trace](firstcustomers/stages.json) | [Result](firstcustomers/result.json), [validation](firstcustomers/offline-validation.json) |
| Tally | [Report](tally/candidate-report.md) | [JSON](tally/first-candidate.json) | [Trace](tally/stages.json) | [Result](tally/result.json), [validation](tally/offline-validation.json) |

The [machine-readable summary](evaluation-summary.json) separates genuine API usage, application outcomes, offline diagnostics and independent manual scores. Each site's `sources.json` contains the exact selected public crawl context plus the crawler's source metadata.

## Actual stage tokens, cost and timing

Prices were checked against the [official model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini): **$0.40/M input, $0.10/M cached input, $1.60/M output**. All eight responses reported **zero cached input tokens**, so the estimated cost is `(input × 0.40 + output × 1.60) / 1,000,000`. These estimates use real response usage, not request-byte estimates or fixture token counts; they are not billing invoices and exclude account-specific adjustments.

| Site | Stage | API status | Actual input | Actual output | API elapsed | Estimated cost |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Senja | Product identification | completed | 2,022 | 371 | 5.685 s | $0.0014024 |
| Senja | Report generation | completed | 1,459 | 2,481 | 16.511 s | $0.0045532 |
| Greensighter | Product identification | completed | 1,758 | 445 | 4.587 s | $0.0014152 |
| Greensighter | Report generation | completed | 1,471 | 2,521 | 16.244 s | $0.0046220 |
| FirstCustomers | Product identification | completed | 1,719 | 428 | 3.733 s | $0.0013724 |
| FirstCustomers | Report generation | completed | 1,480 | 2,434 | 15.861 s | $0.0044864 |
| Tally | Product identification | completed | 1,795 | 419 | 4.193 s | $0.0013884 |
| Tally | Report generation | completed | 1,458 | 2,594 | 17.003 s | $0.0047336 |
| **Total** | **8 genuine calls** | **all completed** | **13,162** | **11,693** | **83.817 s** | **$0.0239736** |

The semantic review, targeted repair and rereview stages each incurred **zero calls and zero tokens**. Their hypothetical token consumption and cost were not estimated as actual usage. Crawl time was 3.164 s for Senja, 4.408 s for Greensighter, 1.186 s for FirstCustomers and 5.105 s for Tally. Per-analysis totals include crawling and local processing; summed execution time is 97.771 s, while the complete test process took approximately 98.83 s.

## Confirmed common failure: review preflight cannot fit

Offline reconstruction used the **unchanged** review schema, review instructions, immutable product context, exact candidate field ordering and request construction. It made **no model calls**. The reconstructed review needed only 650 output tokens, but the provider checked:

`already-billed input tokens + UTF-8 review-request bytes + 1,024 overhead <= 20,000`

| Site | Already billed input | Review request bytes | Overhead | Required input reservation | Over cap by | Remaining output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Senja | 3,481 | 17,092 | 1,024 | 21,597 | 1,597 | 5,148 |
| Greensighter | 3,229 | 17,108 | 1,024 | 21,361 | 1,361 | 5,034 |
| FirstCustomers | 3,199 | 17,306 | 1,024 | 21,529 | 1,529 | 5,138 |
| Tally | 3,253 | 17,775 | 1,024 | 22,052 | 2,052 | 4,987 |

All four conditions fail locally. This does **not** establish that the real review would exceed the token cap: its tokenisation was never measured. The byte reservation is a conservative upper bound mixed with previously measured token usage. The effective 8,000-output setting did not solve an input reservation problem. The earlier mocked accounting tests used 200 input tokens per stage, which understated the accumulated input before review and failed to expose this integration problem.

No cap was raised, no request was bypassed, and no analysis was retried to obtain a more favourable outcome. Consequently this run does **not** validate the live semantic evaluator or the bounded repair mechanism's effectiveness.

## Independent assessment of commercial usefulness

The following is an independent assessment of the **actual candidates**, not the unexecuted model review and not the earlier hand-authored fixtures. It uses the unchanged m6.1 rubric: 0 = defective; 1 = usable with explicit limitations; 2 = specific and decision-ready. Publication requires every dimension at least 1 and claim safety, outreach completeness and success criteria at 2. Completeness scores assess whether a message is coherent and contains a CTA; claim accuracy is assessed separately.

| Dimension | Senja | Greensighter | FirstCustomers | Tally |
| --- | ---: | ---: | ---: | ---: |
| Product relevance | 2 | 2 | 2 | 2 |
| Segment differentiation | 1 | 1 | 0 | 1 |
| Channel suitability | 0 | 0 | 0 | 0 |
| Action specificity | 1 | 1 | 1 | 1 |
| Commercial realism | 0 | 0 | 0 | 0 |
| Evidence and claim safety | 0 | 0 | 1 | 0 |
| Internal consistency | 1 | 1 | 0 | 1 |
| Repetition and filler | 1 | 1 | 1 | 1 |
| Outreach completeness | 2 | 2 | 2 | 2 |
| Success criteria | 0 | 0 | 0 | 0 |
| **Total / 20** | **8** | **8** | **7** | **8** |
| **Independent release judgment** | **Reject** | **Reject** | **Reject** | **Reject** |

### Senja

**What worked:** The product remains testimonial collection/management, not an unrelated SaaS. The server preserved the publisher's quoted “twice as many testimonials” claim as attributed owner evidence. None of the old repeated capability-verification sentences appeared.

**First experiment and targeting:** The recommendation is email outreach to “Small Business Owners,” with a list of 50 contacts. That is a large, weakly qualified audience rather than a precise buyer/use-case hypothesis. Marketing managers and B2B sales leads add plausible roles, but the report does not compare their urgency, buying authority or access, or explain when segment two should outrank the first. It offers no founder-time assumption for 50 researched and personalised emails and no credible resource comparison with its content alternative.

**Success criteria and plan:** It specifies 10% positive replies/demo requests, 500 content page views plus three demo signups, and 20% LinkedIn engagement without supporting economics, audience or baseline. These should not be treated as forecasts, and the candidate does not give a useful commercial continue/change rule. Week four asks for “Clear performance signals from initial tests,” which is not a defined decision criterion. The sequence shifts among email, blogs and LinkedIn before establishing which pain or message is working.

**Outreach:** The email is complete but generic and repeats “easiest” as sales copy. The LinkedIn message asserts “I noticed your role in sales at a B2B SaaS company” despite no prospect research. The name placeholder does not substantiate that observation. The model labels Senja “fastest” elsewhere without comparative evidence.

**Offline checks:** Four deterministic issues and eight changed fields under claim sanitisation. One deterministic issue is an empty LinkedIn subject; requiring a subject for a channel that normally has none is itself a false positive, not a substantive message-completeness failure.

### Greensighter

**What worked:** Correctly identifies task tickets from Jira/Linear/Asana/ClickUp, delivery into Figma and human review. The first channel is direct LinkedIn outreach rather than the previous paid-ad-first recommendation. Startup product teams, agencies and larger internal design teams are somewhat more differentiated than the old report's near-duplicate groups.

**First experiment and targeting:** LinkedIn outreach to product managers/developers is plausible. But requiring Sales Navigator, building 50 prospects and inviting demos is not justified against unknown spend, time, qualification effort or buyer authority. Its rationale does compare preparation effort with webinars, yet does not define a small reversible scope. The agency alternative needs explicit trust, client-confidentiality, design-system readiness and procurement assessment.

**Success criteria and plan:** The report requests response rates above 10%, demos above 5%, 30% connections, five demos in week two, and webinar attendance above 50 with more than ten trials. None is supported by a resource assumption or observed conversion baseline. Readiness measures such as “Content and calendar ready to publish in week 3” do not show commercial learning. The apparent contingency on startup response does not justify automatically preparing a webinar.

**Outreach:** The exact original failure persists: “I noticed your team uses Jira/Linear and Figma.” No such prospect observation was supplied. Other copy promises perfectly matching client design systems and says human review “guarantees quality.” These go beyond merely quoting the owner's stated workflow. The candidate also proposes limited-time trial codes without establishing that such an offer exists.

**Offline checks:** Five deterministic issues and eight sanitiser changes. Some are useful warnings; others demonstrate category errors: the recommendation “initial trial offers” and the title “Figma Community Posts and Offers” are removed because the capability regex matches the noun **offers**. Recommended activities still encounter factual-claim logic.

### FirstCustomers

**What worked:** Correctly identifies SaaS customer-acquisition strategy, profiles and 30-day plans. It targets SaaS founders and does not misidentify the illustrative onboarding analytics product as FirstCustomers.

**First experiment and targeting:** Its starting point is a **Website Signup Funnel Experiment**, involving landing-page copy, CTAs and tracking. That could help an existing visitor stream, but the report establishes no traffic, baseline or way to reach the first prospects. It therefore risks advising a founder to optimise conversions on a funnel with no visitors. Its three groups are overlapping versions of small SaaS founders/teams rather than meaningfully differentiated buying situations.

**Success criteria and plan:** The playbook wants a 10% conversion increase, a doubling of signup rates from content and 20% webinar conversion. It assumes enough traffic for A/B testing without showing a sample or measurement horizon. Signups are repeatedly treated as success in a first-ten-customer playbook without a paid-customer definition. The playbook proposes webinars if content is moderately successful, whereas week four proposes them if content success is limited: contradictory triggers.

**Outreach:** Both messages are complete and avoid invented prospect observations, but are broad, promotional and not tied to a specific acquisition blocker. “Get Your SaaS Sales Strategy in 30 Days” confuses the plan's duration with strategy delivery time. The claim checker also strips a substantively supported paraphrase of the product's actual functionality, showing unnecessary loss of useful content.

**Offline checks:** Zero deterministic issues, despite these substantive weaknesses, and seven sanitiser changes. This is concrete evidence that deterministic keyword/shape checks alone cannot establish commercial usefulness. The unexecuted semantic stage was essential here.

### Tally

**What worked:** Correctly recognises a no-code online form builder with free usage and conditional logic. Publisher privacy/compliance statements remain quoted owner evidence in the product profile.

**First experiment and targeting:** The report again chooses generic cold email to SMB owners, roughly 50 contacts, despite Tally's self-service form-building dynamics. Privacy-conscious enterprises and larger marketing teams are somewhat different buyer groups, but healthcare/legal/education procurement complexity is ignored. It does not compare a focused workflow/template or relevant ecosystem distribution experiment against high-touch demos. Such an alternative would still need evidence; the issue is the missing comparison, not that only one channel can ever be correct.

**Success criteria and plan:** Fifty qualified leads per month, CTR above 2%, CPL below $15, and a future LinkedIn advertising campaign appear without budget, economics, audience or spending assumptions. Week four schedules ads regardless of the missing inputs. Free signups/leads are not connected to a credible paying-customer path.

**Outreach:** Messages are complete but generic. The privacy message promotes “secure, GDPR-compliant” forms without retaining publisher attribution or assessing a prospect's actual compliance requirements. The source itself mentions fair-usage guidelines, but the candidate says “Truly unlimited ... at no cost,” omitting that qualification. The form-logic message asserts conversion improvement without evidence.

**Offline checks:** Five deterministic issues and 24 sanitiser changes. Some removals correctly restrict unqualified claims; others erase legitimate buyer requirements such as “Require GDPR compliance and secure data handling.” Conversely, the conditional opening “If you're looking for ...” allows an embedded affirmative capability/compliance claim to survive the simple prefix exemption. This shows that the same filter is both over-restrictive and incomplete.

## Remaining problems and release decision

1. **Blocking integration defect:** Real candidates do not fit the conservative review preflight at the current input setting, so the main Milestone 6 review/repair flow never executes. The mock usage tests did not validate this realistic path. The next engineering change should compact review context/schema or use reliable token accounting within the existing cap, not weaken quality thresholds merely to obtain passes.
2. **Claim categories remain conflated:** Outcome targets, buyer requirements, noun uses of “offers,” and statements about a marketing approach can be flagged as product assertions. Meanwhile conditional-prefix exemptions can conceal affirmative claims. The fallback insertion is fixed, but useful field-specific verification is not fully solved.
3. **Generation does not reliably follow the commercial prompt:** All four outputs retain unsupported numeric thresholds, insufficient resource/access evaluation and generic channel sequences. FirstCustomers is particularly weak on acquiring traffic; Tally insufficiently reflects a different self-service buying model.
4. **Structured gaps matter:** The current visible fields allow scope, resource assumptions and decision rules to be omitted or buried in prose. The generation contract should make these obligations reviewable without changing the UI or relaxing validation.
5. **Live semantic review and repair remain unproven:** No semantic scores or repaired outputs exist from this run. After fixes, a separately authorised controlled evaluation must establish actual pass/reject behaviour, preservation of attribution and repair quality. This evaluation's single-attempt allowance is exhausted; no additional model runs were made.

The safe outcome is that defective candidates were **not published**. That is necessary but insufficient: a production report feature that rejects every observed genuine candidate is not ready to release. Preserve the evidence, fix the integration and verification semantics, and validate again before recommending production approval.

## Local verification

The live evaluation harness recorded four outcomes in 98.83 seconds. A separate offline-only run reproduced all four input-preflight failures and rendered full candidate artifacts without calling the model. Type checking and lint passed. The normal automated suite passed **173 tests**, with **34 opt-in tests skipped** (including the new live/offline harness when its flags are absent). All 24 original evidence-file hashes and the evaluated implementation hashes were verified; the four first/final candidate pairs are byte-identical, and no accepted-report artifact exists. No application production build or deployment was needed because application code was unchanged in this evaluation turn.

This is a four-site, one-sample-per-site evaluation, not a statistical estimate of model reliability. Independent rubric scores are engineering judgments; they do not replace the unavailable live semantic-review results.
