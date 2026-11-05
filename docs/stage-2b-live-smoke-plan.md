# Controlled signed-in Senja live smoke

Approved by the owner in this chat: one fresh identification with configured GPT-4.1 mini, one GPT-6.1 Sol strategy, and one GPT-4.1 mini explanation. Total API ceiling: **US$0.40**, shared across all three calls. No retries, repairs, graders, prompt tuning or additional paid requests.

Website: `https://senja.io/`. Founder context: launched with no paying customers, three hours/week, USD 0/month, no previous acquisition efforts. The existing Stage 2B strategy prompt and models remain fixed throughout the run.

Checkpoint `d4c1aca` preserves the approved Stage 2B implementation. The presentation changes use static concise headings while retaining full saved buyer/channel text and reasoning, show the first incomplete task near the top, and condense mobile navigation to one horizontally scrollable row. No generated strategic decision is edited or truncated.

Target rechecked before launch: `firstcustomers_advisor_dev` at `127.0.0.1:55441`, role `firstcustomers_test`. No schema changes are needed. The new `local-live-smoke-founder` account did not exist at preflight, so this run cannot reuse a fixture profile or strategy. Existing application auth/session code talks to a local auth-only upstream; the website crawl and all three OpenAI calls are real. Hosted Neon Auth itself is outside this isolated smoke test. The local upstream refuses AI/source fixture endpoints during the run.

The opt-in audit captures exact request bodies, full original responses/visible text, API latency, usage, calculated costs and safe errors in `docs/stage-2b-live-smoke`. Its durable ledger enforces the call sequence and shared ceiling before dispatch, retaining uncertain reservations on failure. Production rejects audit mode. Normal advisor requests retain their existing per-operation ceilings ($0.30 for identity/strategy, $0.03 for help) as an additional bound. The existing SDK retry count remains zero.

The browser will sign in, submit the URL/context, activate the generated strategy, reload, mark one task complete as a persistence test, reload again, and request exactly one explanation. It compares saved strategy ID/content before and after help. This checkbox interaction is a test record, not evidence that the founder executed the suggested acquisition activity. Desktop/mobile screenshots and the full strategy/explanation will be preserved for review. Live settings will be disabled after the run. No production settings, database or deployment are changed, and Stage 3 remains out of scope.
