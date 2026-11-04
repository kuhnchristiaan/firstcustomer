# Milestone 3 — strategy critique and claim safeguards

## Implementation

- `src/modules/strategy/provider.ts`: a schema-valid candidate followed by one independent structured critique. The reviewer may keep it without rewriting or return one corrected strategy. Only the reviewed, claim-filtered final output passes publication validation. No automatic retries or autonomous loops.
- `critique-schema.ts`, `schema.ts`: strategy schema 3.0 adds a nine-factor qualitative segment comparison, alternatives, concise weaknesses/corrections, concrete channel experiments, weekly effort accounting, claim reviews/actions and per-stage token usage. Existing 2.0 revisions remain readable.
- `claims.ts`: structured source/founder checks plus conservative deterministic guards for high-risk performance, compliance, testimonials, capabilities, security and comparison assertions. Unsupported sentences become questions or are removed. No independent verification is claimed. Original report records remain unchanged; older outputs receive display-time safeguards.
- `service.ts`: existing tenant/guest access, quotas, immutable revision history and approvals remain in use. Failed review never replaces a successful report. Manual edits pass claim safeguards. Combined cost bounds are checked before reservation and known usage from both calls is retained on failure.
- `progressive-report.tsx`: prominent first move, concise segment trade-offs, alternatives, expandable experiments/effort assumptions, and Edit Founder Context. Optional audience and confirmed-feature answers are preserved separately from website facts. Correction generates a revision without crawling again.
- Initial analysis instructions and publication filtering also reject unsupported marketing assertions. `report.tsx` protects older initial-report display without rewriting historical records.
- API refinement deadlines accommodate two bounded calls; no deployment configuration or infrastructure was provisioned.

## Persistence and compatibility

No database migration. Existing JSON columns store the new strategy version and metadata. Existing original analyses, sources, revisions, approvals and guest-to-account ownership transfers retain their identifiers and access controls. JSON Schema snapshots are in `schemas/sales-strategy.v3.json` and `schemas/founder-context.v2.json`; previous snapshots remain intact. Cross-field constraints are enforced by application validation in addition to JSON Schema.

## Cost and planning controls

Default combined limits: 38,000 input tokens and 9,000 output tokens, allocated 4,000 to the candidate and 5,000 to critique/correction. Conservative UTF-8 request byte bounds include structured schemas and framing before each call. At explicitly configured rates of $0.40/$1.60 per million input/output tokens, the upper cost is $0.0296. Rates must match the selected model; no current price is inferred. The lower of the refinement ceiling and guest ceiling applies. Missing/invalid rates fail closed. `.env.example` documents the new optional settings; existing secret files are unchanged.

All weekly action sums and channel allocations must fit founder availability; monthly direct costs must fit their budget/currency. Generation schemas additionally cap each action at one third of available time, and each of two channels at half the time/budget. Text generation is capped at 180 characters per free-text field to reduce truncation; persisted schemas retain their previous limits. The reviewer compares the candidate's three exact segment identities and can reorder their priorities; a separate alternative segment can be suggested.

The server calculates research/preparation/outreach/reply/follow-up allocations within each weekly action total. Research reserves at least 40% of task time and at least five minutes per first-batch prospect; remaining time is split across the other four phases. These are explicit conservative planning heuristics, not measured market data. Insufficient time fails validation rather than publishing an impossible plan. A batch is deliberately small (at most five, further reduced for limited time). Manual edits retain validation of total time and all phases.

## Verification and limitations

Deterministic scenarios cover zero customers/no budget/one hour/no audience, existing referral traction, enterprise procurement, unsafe claims and context correction. Provider tests cover keep/revise decisions, malformed/inconsistent reviews, two-stage usage, review failures and combined input bounds. Local PostgreSQL tests exercise claiming, ownership, isolation, immutable history, approvals, quotas and concurrency.

Final checks: `npm test -- --maxWorkers=1` with isolated local PostgreSQL: 134 passed, 3 opt-in tests skipped. The opt-in synthetic live refinement test was run separately and passed after fixes for stage order, truncation, segment identities and effort arithmetic. It makes no website or database requests. Initial live attempts failed safely and did not publish reports. One successful live fixture is not a reliability benchmark across real websites. Lint, TypeScript and the production build passed. A Windows permission failure creating `.next` output was resolved by retrying the local build with the required access.

The built app started successfully on `127.0.0.1:3000`. HTTP smoke checks returned 200 for `/`, `/preview`, `/auth/sign-in`, `/robots.txt` and `/sitemap.xml`. Listening on localhost initially required a sandbox permission retry. The isolated PostgreSQL test server was stopped after verification. `.env`, `.env.local`, `.env.production` and `.vercel/project.json` remain ignored.

Claim safeguards are conservative, not a factual-proof system. Matching a fetched quotation checks provenance; semantic entailment remains AI-assisted. Regex guards cannot recognize every possible paraphrase and may remove useful supported wording. Legal, security and performance assurances require evidence outside this MVP. No live prospects, communities, competitors or market demand are researched. Full browser guest-to-signup/claim and visual/mobile/print verification have not been repeated for this milestone. No production deployment was performed.
