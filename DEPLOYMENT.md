# GitHub and Vercel

Source repository: https://github.com/kuhnchristiaan/firstcustomer

The application targets Node 24 on Vercel. GitHub Actions uses an isolated PostgreSQL service to run migrations, lint, deterministic and database integration tests, production build and type checking. It has no production secrets or paid AI access. Actions are pinned to commit IDs.

Vercel uses the existing FirstCustomers database and auth service. Do not initialize Neon again, create account-wide keys, configure MCP integrations, or use EDUCERT resources. Production database migrations are deliberate operator actions, not part of an unreviewed build or preview deployment.

## Production configuration

Store credentials only in Vercel environment variables. Never upload `.env.local` or local test artifacts as source. Required settings:

- `DATABASE_URL`: existing FirstCustomers pooled database connection.
- `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`: existing FirstCustomers auth configuration.
- `APP_URL`: exact production HTTPS origin.
- `OPENAI_API_KEY`, `OPENAI_MODEL`, token limits and model rates: existing provider configuration.
- `MOCK_ANALYSIS=false`.
- `STRATEGY_REFINEMENT_ENABLED=true` after the committed migrations are applied.
- `GUEST_ANALYSIS_ENABLED=false` until valid production Turnstile keys and guest cost controls are configured.

Do not copy `DEV_LAN_ORIGIN`, localhost origins, public Turnstile test credentials, or `GUEST_IP_MODE=local` into production. Use `GUEST_IP_MODE=vercel` when public guest generation is enabled. Add the exact deployment origin to the existing FirstCustomers Neon Auth trusted domains using the owner’s console session; no new management API key is necessary.

Preview deployments must use isolated database/auth credentials before exercising persistent features. Production secrets should not be exposed to untrusted preview branches. A preview without credentials may fail its build until isolated services are configured.

## Public guest generation

Once the HTTPS Vercel hostname exists, register it with Cloudflare Turnstile (a purchased domain is not required). Configure real site/secret keys, existing guest quotas and model-specific rates, then enable guest generation and redeploy. Production rejects development test keys. Scheduled guest cleanup can be configured separately after supplying `CRON_SECRET`.

Vercel serves HTTPS, allowing secure auth cookies and phone access without the local Wi-Fi limitations.
