# FirstCustomers

The local application now supports full guest reports before signup. See [GUEST_REPORTS.md](GUEST_REPORTS.md) for local testing, security, quotas and claiming. The app is linked to the dedicated FirstCustomers Neon project. See [NEON_SETUP.md](NEON_SETUP.md) for setup details and service acceptance results. Secrets remain in `.env.local`.

Free SaaS Sales Strategy Generator for founders. Next.js 16 App Router, strict TypeScript, React, Tailwind, shadcn-style components, Prisma 7, PostgreSQL, Neon Auth and OpenAI Responses structured outputs. No subscription billing or future paid acquisition features.

## Local setup

Use Node 24 LTS (the Vercel and CI runtime). Run `npm ci` and `npm run dev`, then open http://localhost:3000. The landing page and illustrative sample work without credentials. Real guest reports need PostgreSQL, OpenAI and the protected guest configuration; they never require a user account. See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub/Vercel deployment.

For accounts and persisted reports:

1. Create a **separate FirstCustomers Neon project**, in an Auth-supported AWS region. Enable Managed Neon Auth. Never reuse EDUCERT resources, data or credentials.
2. Copy `.env.example` to `.env`. Enter the project's pooled `DATABASE_URL`, direct `DIRECT_DATABASE_URL`, and branch `NEON_AUTH_BASE_URL`. Generate `NEON_AUTH_COOKIE_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Set `APP_URL=http://localhost:3000`.
3. Add the application origin to Neon Auth trusted domains and verify localhost support. Configure email/password authentication and the branch's email verification policy. Test verification delivery and completion before release. The application uses the official same-origin Next.js proxy and server session methods.
4. Run `npm run db:deploy` to apply the committed initial migration. Future schema changes use `npm run db:migrate -- --name description`. Prisma migrations are authoritative; do not replace migration history with `db push`.
5. For local fixture reports, set `MOCK_ANALYSIS=true`. This requires PostgreSQL but makes no crawl or paid AI calls. Guest fixture reports require no account; authenticated operations still require real Neon authentication. Results are visibly marked sample data. Mock mode is rejected in production.
6. For real generation, set `MOCK_ANALYSIS=false`, `OPENAI_API_KEY`, and an available structured-output `OPENAI_MODEL`. Configure current model token rates for dollar estimates; absent rates display cost unavailable.

Anonymous URL submission now runs the real, protected analysis pipeline and displays every report section. Signup is offered after the report, for saving/editing/revisiting it. An HttpOnly cookie authorizes private guest access for 24 hours. Signup securely claims the original run into the authenticated organization without another AI call. `/preview` is a separately labeled complete sample, and old URL-preview links return to the real generation form.

## Report contract and review

`src/modules/intelligence/schema.ts` defines the authoritative Zod/JSON contract with `schemaVersion: "1.0"`. It includes all nine requested sections: SaaS assessment; exactly three prioritized ICPs; pains and motivations; positioning; channel experiments; outreach templates; first-ten-customers playbook; four weekly action plans; assumptions and validation questions. Recommendations include rationale, practical steps and success measures.

Claims carry Verified / Inferred / Unknown and source references. Verified requires a fetched source URL. Inference is not proven demand. The server rejects invented source URLs and strategy recommendations marked Verified. A valid URL is provenance, **not proof of factual entailment**: users must review the cited page. No real prospect list or competitor research is invented.

After claiming or signing in, each section is editable. Approval saves an immutable, versioned `ProductProfile`, normalized `CustomerSegment` rows and an audit event. The complete report stays in JSON findings; original AI output, source content and run history remain unchanged. Optimistic version checks reject stale edits. Re-analysis never overwrites the approved report. Print / PDF uses browser printing with navigation and controls hidden.

## Architecture

Modular monolith: `modules/auth` owns identity and tenant context; `modules/website` validates/fetches/extracts; `modules/analysis` orchestrates through a provider interface; `modules/intelligence` owns report validation; `modules/usage` owns quota policy; `modules/config` validates configuration; `modules/guest` owns anonymous access, quotas and claiming; `modules/analytics` stores aggregate funnel counters. Route handlers are thin transport boundaries. Prisma services own database access.

First authenticated use provisions one owned organization idempotently. Memberships support future teams; organization switching and team management are not implemented. Tenant identity comes from the verified server session, never a submitted organization ID. Every product operation includes that organization scope. Neon owns its auth schema, Prisma migrations own application tables. PostgreSQL row locks and standard SQL keep the domain portable.

## Security and bounds

- Protected pages and APIs validate Neon sessions server-side. Mutations check Origin. JSON bodies have a streamed 100 KB ceiling. No public API keys or raw exception details are returned.
- Public HTTP(S) only. Reject credentials, local/private/reserved IPs and unexpected ports. Validate every DNS answer and pin the socket to a validated address to resist rebinding. TLS stays enabled. Revalidate redirects; reject cross-origin and HTTPS downgrade redirects. Submit the final canonical URL if the site redirects between bare/www hosts.
- Robots is fetched first; unavailable restrictions fail closed. Disallowed pages are skipped. Crawl delays up to three seconds are respected; longer delays fail clearly. At most eight pages (default five), 1 MB per response, deduplication, six-second socket inactivity timeout, 125-second overall abort signal and conservative input bounds.
- Ordinary HTML only. JavaScript-only sites, anti-bot pages and restricted robots may fail without invented results. Prompt text treats website content as untrusted data. No model tools, credentials or execution abilities are exposed. Prompt injection cannot be categorically eliminated; generated claims require review.
- OpenAI retries are disabled. UTF-8 bytes conservatively bound source tokens with prompt overhead reserved, and output has an explicit token limit. The effective crawl text budget may be smaller than `MAX_CONTENT_CHARS`.
- Per-organization default: 20 attempts per UTC month, one concurrent run, three starts per minute. **Failed attempts count.** Organization row locking makes reservation atomic across instances. Duplicate successful submissions within one minute are rejected. Expired run leases become failed on the next reservation.
- The server awaits the complete bounded job. No unawaited background tasks, queues, permanent workers or new services. The route requests 150 seconds; verify deployment duration support. Platform termination may leave a pending row until lease expiry.

## Environment variables

Required for authenticated operation: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ characters), `APP_URL`. Use `DIRECT_DATABASE_URL` for migration connections. Live generation also requires `OPENAI_API_KEY`.

Optional defaults: `OPENAI_MODEL=gpt-4.1-mini`, `MOCK_ANALYSIS=false`, `MAX_PAGES=5` (maximum 8), `MAX_CONTENT_CHARS=24000`, `MAX_INPUT_TOKENS=20000`, `MAX_OUTPUT_TOKENS=4500`, `MONTHLY_ANALYSIS_QUOTA=20`, `MAX_CONCURRENT_ANALYSES=1`. Optional pricing: `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION`. Never prefix secrets with `NEXT_PUBLIC_`.

## Checks

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. The build uses supported webpack because the Turbopack CSS subprocess failed in this Windows sandbox. Prisma client is generated on install/build and not committed. Vendor declarations require `skipLibCheck` for upstream Bun/URLPattern typing conflicts; application TypeScript remains strict.

Tests cover restricted URLs/IPs, extraction, quotas, malformed reports, unsupported evidence, missing sessions, tenant-scoped reads, unauthorized approvals, failed analyses, optimistic updates and versioned persistence. The local HTTP acceptance scripts verify live Neon sessions/PostgreSQL and paid OpenAI generation, including guest generation and secure claiming. See `VERIFICATION.md`; email verification delivery and Vercel deployment still need release checks.

## Deployment and operating cost

The dedicated FirstCustomers Neon project is configured and migrated; no billing plan was changed. The source repository is [kuhnchristiaan/firstcustomer](https://github.com/kuhnchristiaan/firstcustomer). Vercel uses project-specific variables; add deployment origins to Neon Auth and set `APP_URL` correctly. Preview deployments should use isolated database/Auth URLs. See [DEPLOYMENT.md](DEPLOYMENT.md) for production settings and guest protection requirements.

No additional fixed-cost services are required by this code. Actual database, hosting, auth/email and AI costs depend on plans and usage. Free founder access still incurs operator AI costs. Use a dedicated OpenAI project, limits/alerts, low tenant quotas and current token rates. Quotas do not stop abuse through many accounts: public-launch follow-up requires signup abuse controls and an operator-wide spend ceiling. No Redis, R2, Railway or workers are needed.

Token usage and estimated cost are stored on successful runs and on malformed/incomplete provider responses when the provider supplies usage. Network interruptions or database persistence failure can still leave provider usage unrecorded; provider billing is the financial source of truth. Incomplete output fails clearly rather than producing an invented report.

Neon Auth currently publishes a beta SDK. Narrow same-major overrides patch its pinned Better Auth to 1.7.16 and Zod to 4.6.7, removing installed critical/high advisories. Revalidate the managed auth flow before release and remove overrides after vendor updates. Remaining npm advisories affect optional UI/email dependencies and lint tooling; inspect `npm audit` rather than applying breaking downgrades with `--force`.

## Remaining limitations

Guests can read the complete real report. The separate sample preview remains illustrative. The editor changes existing fields and does not add/remove entire sections. Password recovery is implemented through the existing Neon SDK; real email delivery and reset completion still require an owner-run test. Verification-code UI, team invitations, organization switching, a deployment-wide spend ceiling for authenticated jobs and signup abuse controls are not implemented. Guest jobs have their own enforced global daily and per-report cost bounds. Configure and verify the Neon signup policy accordingly before launch. Live service acceptance now passes with the separate project's credentials; see `VERIFICATION.md`. No paid features, billing, prospect discovery or outreach delivery are implemented.
