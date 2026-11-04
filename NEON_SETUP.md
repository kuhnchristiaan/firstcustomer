# FirstCustomers Neon setup — 4 November 2026

## Resource identity

- Organization: `org-ancient-waterfall-77114062` (`FirstCustomer`, free_v3).
- Project: `misty-bar-85645678` (display name `FirstCusomer`).
- Branch: `production`, ID `br-odd-cake-ba4pc9g8`.
- Region: `aws-eu-central-1`, PostgreSQL 18.
- Database: `neondb`; Managed Better Auth uses its own Neon-managed schema.

Only this project was inspected or modified. EDUCERT resources and data were not accessed. No billing plan or Vercel deployment changed.

## Commands and setup outcomes

`npm i -g neon@latest` installed Neon CLI 8.18.0. The stored OAuth refresh token was rejected with `invalid_grant`; `neon login --profile DEFAULT` completed a fresh browser sign-in successfully.

The original initialization created the project binding and service declarations, but also configured unwanted agent integrations and an account-scoped MCP key. The owner has since reported that key revoked and those integrations removed. **Do not rerun that initialization or recreate any API keys/MCP integrations.** The application uses its legitimate database/Auth environment settings and needs no Neon management API key at runtime.

The earlier optional agent-skills installer failed because the then-installed Node version was below its minimum; this historical tooling issue is unrelated to application credentials. Node has since been upgraded.

`neon deploy` exited successfully:

```text
No changes — branch production already matches the policy.
Utilized services: Postgres, Neon Auth
Pulled 5 Neon variables into .env.local
```

`npm run db:deploy` applied `20261104000000_initial` successfully to this project's database. Neon Auth already existed and was reused. Its existing email/password policy permits signup, does not require email verification, and does not send signup/signin mail. Localhost access is enabled; those security settings were not weakened.

## Application wiring

- Runtime Prisma uses the pooled `DATABASE_URL` through the existing `pg` adapter.
- Prisma CLI now loads `.env.local` as well as `.env`, preferring injected environment values and then Neon's `DATABASE_URL_UNPOOLED` for migrations. `DIRECT_DATABASE_URL` is synchronized to the verified endpoint.
- Existing OpenAI settings and cookie secret are preserved; placeholder cookie secrets are replaced with a cryptographically random value.
- `src/proxy.ts` applies Neon session middleware to dashboard/product routes. Route handlers and domain services still enforce authentication and tenant ownership independently.
- Local environment files, `.neon`, and acceptance artifacts remain Git-ignored. No credentials are committed.

## Acceptance test

Build the app, start it at `http://localhost:3000`, then run `npm run test:neon`. The script refuses a different project/endpoint, uses randomized test accounts at reserved example.com addresses, generates a bounded paid OpenAI report from plausible.io, approves an edit, signs out/in, reloads the saved report, and checks cross-tenant read/write denial. It leaves its test accounts/report in this project for auditability and does not delete user data. No password or session token is printed or stored in the acceptance artifact.

Results are written to `.local-live-test/neon-acceptance.json` after all checks pass. See `VERIFICATION.md` for the final observed results.

Two live-path defects were addressed during acceptance work: recommendation confidence constraints now exist directly in the structured generation schema, equivalent source URLs normalize to fetched references, and source persistence explicitly selects database columns rather than passing crawler-only link metadata into Prisma. Known AI usage is retained when a later persistence operation fails.
