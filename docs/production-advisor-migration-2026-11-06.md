# FirstCustomers production advisor migration — 6 November 2026

Explicitly authorized by the user to prepare the live database. No application deployment or feature activation was performed.

## Target verification

- Existing FirstCustomers project binding: `misty-bar-85645678`, branch `production`; direct `neondb` connection from the existing ignored FirstCustomers environment file.
- Verified the exact documented FirstCustomers endpoint allowlist and matched the existing Auth endpoint against the confirmed FirstCustomer Vercel production project's readable Auth configuration.
- Vercel's sensitive DATABASE_URL could not be read back; Neon management metadata retrieval timed out. Neither was bypassed or replaced with new credentials. The documented project binding, endpoint allowlist and matching production Auth configuration established the target before database access.
- Existing three migrations matched repository SQL, accounting for historical CRLF/LF line endings. No checksum record or existing migration was modified.

## Execution

A custom-format backup of the production public application schema/data was created successfully in the ignored local migration directory before executing Prisma. It contains sensitive application data and is intentionally not committed or copied into this report.

`prisma migrate deploy` used the explicitly injected direct FirstCustomers connection and applied only:

1. `20261105030000_signed_in_advisor`
2. `20261105040000_weekly_advisor`

Both completed successfully. All five repository migrations are now applied. The five advisor tables exist, and AdvisorStrategy.strategyVersion is non-null with default 1. These changes are additive to the historical application.

## Data preservation

Before/after row counts and aggregate row fingerprints matched for every one of the 14 pre-existing public application tables. This includes 21 analysis runs, 3 product profiles, 3 strategy revisions and 7 user records. No historical reports, profiles, tasks, accounts or guest data were rewritten. The managed Auth schema was not altered by these migrations.

The full target proof, migration output, checksum diagnosis and verification fingerprints remain in the ignored `.local-live-test/production-migration` directory alongside the backup. No credentials are included in this document.

## Outcome

The live FirstCustomers database is ready for the updated signed-in advisor/weekly-review code. Advisor activation and code deployment remain separate steps. No push, merge, deployment, model call, EDUCERT access, credential creation, billing-plan change or new infrastructure occurred.
