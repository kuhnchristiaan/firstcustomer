# Guest reports — local development

Visitors can generate and read the complete report before signup. The primary landing CTA starts a real analysis. `/preview` remains a clearly marked, complete illustrative sample; old `/preview?url=...` links return to the landing form with that URL filled in, without starting a paid job on GET.

## Test locally

Run `npm run dev` and open http://localhost:3000. The existing `.env.local` is configured with Cloudflare's official **test** site/secret keys, `GUEST_IP_MODE=local`, a random private hashing secret, the existing OpenAI key, and explicit GPT-4.1 mini rates. No domain, Cloudflare widget resource, Vercel deployment or additional paid service was provisioned. Local mode treats every visitor as the same loopback network and ignores forwarding headers.

1. Enter a public SaaS website and generate the strategy. All sections are readable without an account, including messaging, channels and the 30-day plan.
2. Select **Save My Strategy — Free** when ready. Signup and sign-in preserve the save intent; the original guest cookie stays in the same browser.
3. After Neon Auth succeeds, `/guest/claim` transfers that existing analysis to the authenticated organization and opens the exact run. It does not call OpenAI again. Existing approved profiles for the same website are preserved.
4. The saved draft can be edited and approved through the existing profile workflow. Later sign-ins can open it from the workspace.

`npm run test:guest` performs a real localhost acceptance flow with one paid generation and test accounts at reserved example.com addresses. It leaves its test report/accounts for auditability. Results are in `.local-live-test/guest-acceptance.json`, which contains no passwords, session cookies or guest tokens and is Git-ignored. The test checks the model/project endpoint and refuses a different database. It deliberately consumes normal guest quotas; it does not reset live counters.

**Use development mode for local guest testing.** The production runtime refuses localhost IP mode and Cloudflare dummy keys. `npm run build` still verifies the production bundle; `npm start` with these local protection settings will allow authenticated features but reject new guest jobs safely.

## Ownership, expiry and claiming

`GuestAnalysisSession` owns temporary runs independently of organizations/products. `AnalysisRun` and `WebsiteSource` are reused; their product relation is optional until claiming. A SQL check requires every analysis to have a guest session or a product. The additive Prisma migration preserves existing records and foreign keys.

A 256-bit random token is sent only in an HttpOnly, SameSite=Lax, host-only cookie. Production uses the `__Host-fc_guest` prefix plus Secure; HTTP localhost development uses `fc_guest`. Only SHA-256 of the token is stored. Tokens never appear in URLs, JSON report responses, analytics or logs. Report endpoints accept no report ID for guest authorization. A wrong/missing token is denied.

Sessions expire after 24 hours by default. Reads and claims check expiry immediately, even if cleanup has not run. Near-expiry sessions cannot start a long job. Claiming checks both token possession and active organization membership, then locks the guest session. First-workspace provisioning is serialized by a user-row lock, and product claiming is serialized by an organization-row lock. Replays by the same organization return the same product/run; other tenants are denied. A claimed report cannot be read through the guest endpoint. Signup in another browser without the cookie cannot claim by email or website URL.

Approval is still a separate review step. Claiming saves the exact generated draft permanently under the account without pretending that its inferences have been validated.

## Financial and abuse controls

All admission counters live in PostgreSQL. An atomic insert initializes the admission row, then a row lock serializes quota checks and run reservations across instances. No in-memory counter is authoritative.

Defaults: one successful report per guest session; at most two attempts including failures; two attempts per network per hour and three per day; two concurrent guest jobs globally; 20 guest attempts per UTC day. Duplicate active submissions and repeat successful submissions are rejected before another AI call. Session creation is also limited to ten new sessions per network per day and ten times the daily job cap globally. Expired processing leases are failed before another concurrency slot is admitted. Attempts remain charged against quota even after errors or platform interruption.

Turnstile tokens are verified server-side before admission. Public mode checks success, expected hostname and action; official local test keys have dummy response metadata and are accepted only outside production. Missing/invalid verification fails closed. Production reads only `x-vercel-forwarded-for` when Vercel's server-injected `VERCEL=1` is present. Arbitrary X-Forwarded-For/CF headers are ignored. A proxy in front of Vercel may cause multiple visitors to share one network bucket; the app does not trust extra proxy headers to loosen this restriction.

Raw IPs are never persisted or sent as an extra Siteverify parameter. Quotas use a daily rotating, secret-keyed HMAC. Network counters expire after 48 hours and can be physically removed by cleanup.

Guest processing is bounded to three pages, 4,000 extracted characters or a stricter configured limit, and an explicit input/output ceiling. The input check conservatively includes the serialized system prompt and structured-output schema, not just website text. OpenAI retries remain disabled. No paid tools or model-side web browsing are enabled.

A priced model name must exactly match `OPENAI_MODEL`; explicit positive input/output rates and a maximum estimated cost are required. Current local settings use 30,000 conservative input tokens and 6,000 output tokens. At the configured $0.40/$1.60 per million rates, the reservation bound is $0.0216 per attempt, below the $0.03 per-report limit. With the default global cap, at most 20 guest jobs are admitted daily. Operator pricing must be updated if the provider changes prices. Estimates are not provider invoices.

These global controls cover **guest** jobs. Existing authenticated organization quotas remain in place; they are not a deployment-wide financial cap. Keep the dedicated OpenAI project limits/alerts and address signup abuse before any broad public launch.

## Analytics and cleanup

`FunnelMetric` stores only UTC day, event name and aggregate count. Events cover landing, URL submission, guest starts, successes/failures, report views, save clicks, registration starts/completions and successful claims. Temporary hash-only markers deduplicate client events once per guest session. No report text, website URL, email or raw IP is stored in analytics. Client events are best effort; server success/claim events are transactional. These are unique-per-session funnel counts, not raw page-hit counts.

`GET /api/cron/guest-cleanup` requires `Authorization: Bearer <CRON_SECRET>` with a random 32+ character secret. Each invocation removes at most 100 expired, unclaimed sessions and their runs/sources, plus a bounded counter batch. Claimed reports are preserved. Schedule repeated bounded calls when hosting is configured, or invoke it manually locally. No scheduler is currently provisioned. Configure frequency for expected traffic and repeat batches to drain a backlog. Expiry protection never depends on physical deletion.

## Configuration and public deployment later

See `.env.example` for all `GUEST_*` limits. To eventually enable public guests, replace both Turnstile test keys with real keys for the deployed hostname, set `GUEST_IP_MODE=vercel`, set the HTTPS `APP_URL`, verify the current model rates, and explicitly enable `GUEST_ANALYSIS_ENABLED`. A missing key, unsupported metadata source, mismatched priced model or excessive cost bound rejects new jobs. Already-generated guest reports remain readable/claimable until their stored expiry even if new guest generation is switched off.

Reference: [Cloudflare test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/), [server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Vercel request metadata](https://vercel.com/docs/headers/request-headers), [GPT-4.1 mini pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini).
