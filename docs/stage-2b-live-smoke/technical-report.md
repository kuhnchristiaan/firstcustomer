# Signed-in Senja live smoke — 5 November 2026

**Result: passed.** One genuine identification, one genuine GPT-6.1 Sol strategy and one genuine lower-cost explanation completed through the actual signed-in advisor. Total usage-based API cost estimate: **US$0.0203675**, below the approved **US$0.40** ceiling. No retry, repair or grader call occurred.

The run used the exact requested website and founder context: `https://senja.io/`; launched with no paying customers; three hours/week; USD 0 monthly acquisition budget; no previous acquisition efforts. The generated buyer/channel/tasks and explanation are preserved unchanged in [strategy.md](strategy.md) and [explanation.md](explanation.md). Exact raw requests, original API responses and visible output files remain alongside them.

| Operation | Model returned | Input | Output¹ | API latency | Estimated cost |
| --- | --- | ---: | ---: | ---: | ---: |
| Identification | gpt-4.1-mini-2025-04-14 | 7,004 | 473 | 5.995 s | $0.0035584 |
| Strategy | gpt-6.1-sol | 1,386 | 1,243 | 37.214 s | $0.0158935 |
| Explanation | gpt-4.1-mini-2025-04-14 | 1,445 | 211 | 2.794 s | $0.0009156 |

¹ Strategy output includes 309 reasoning tokens; those tokens are not charged twice. Total input/output: 9,835 / 1,927. All three responses were `completed`, Standard/default tier, with no API error or incomplete-output detail. Costs price actual API-reported usage at the checked Standard rates, including reported cache writes, rather than claiming an invoice value. The conservative ledger upper estimate is $0.020369, with no unknown usage. [Cost detail](cost-summary.json).

## What was verified

- Real Senja crawl using the existing SSRF/robots-aware extraction, followed by real identification and quotation hydration. The local upstream refused source/AI fixtures; its AI call count remained zero.
- The genuine Sol output satisfies the existing `advisor/1` schema, with valid saved product evidence IDs, one buyer/channel, five tasks, explicit access check/fallback and resource checks. The plan uses **150 of 180 minutes**, leaving **30 minutes free**, and zero direct spend.
- Generation transactionally saved and activated strategy `cmw3l6hbw0005zosgoxz50q17`. Its ID and full output survived refresh. An independent local SQL read confirmed semantic equality to the original activated API output (JSONB key order is immaterial).
- One task checkbox was marked as a persistence test and survived refresh. The top next-action card advanced to task two. This test completion is not evidence that the founder performed the activity or acquired a customer.
- The explanation was a new uncached real model response. Saved strategy ID/content remained unchanged afterward. The strategy hash recorded from the application is `e3baa2aaf18ad9061f60787c330fff8c94aaba9a7d00860f80dd3feb17eaf95b`.
- Desktop/mobile screens were captured. Mobile workspace navigation is now **48px high**, horizontally scrollable; there was no horizontal page overflow, no browser page error and no mobile axe violation.

[Browser verification](browser-verification.json) and [database evidence](database-evidence.json) preserve the observations. Offline replay validates the original raw output/provenance and resource contract without new AI calls. Budget/order/unknown-usage guards were checked with synthetic transport fixtures before the paid run.

## Presentation changes

The next incomplete task appears near the top and links to its full instructions. Short static headings (“Target buyer”, “Primary channel”) leave the complete generated buyer/channel wording and expandable reasoning intact. Mobile header and workspace navigation take less height. No generated text, strategic decision or rationale was truncated or rewritten.

## Interpretation and limits

This verifies technical behavior, not acquisition outcomes or proven channel access. The founder must still validate community rules, reachable suitable buyers and the actual paid SaaS offer. The explanation uses “sponsoring or promoting” despite the zero-spend context; the saved plan itself proposes only permitted free participation. That wording deserves commercial review and was preserved, not repaired. Its “30 seconds” form-creation statement comes from the selected website owner claim, not an independently timed guarantee.

The raw identification summary ends mid-sentence. The existing attribution hydrator replaces generated summaries/website claims with exact selected source quotations; the saved summary is the complete owner title, “Senja - Collect, Manage and Share Testimonials”. No additional model call or new repair pipeline was used.

Environment: unchanged app authentication/session adapter against an **auth-only loopback upstream**, fresh local account, real local PostgreSQL `firstcustomers_advisor_dev` at `127.0.0.1:55441`. This is genuine website/AI integration, with local authentication test infrastructure; it is not a hosted Neon Auth acceptance test. No schema change or migration was needed for this smoke. Production settings, accounts/data and deployment were untouched.

Checkpoint `d4c1aca` preserves the approved Stage 2B baseline. After the three calls, the paid-enabled development process was stopped. All further output formatting/verification was offline. Stage 3 has not started; work stops for review.

## Screenshots

- [Desktop dashboard](dashboard-desktop.png)
- [Mobile dashboard](dashboard-mobile.png)
- [Real explanation in the app](explanation-desktop.png)
