# Stage 3 local release-candidate checkpoint

Date: 5 November 2026. Branch: `codex/stage-3-weekly-advisor`. Parent: `120a763`.

This checkpoint includes the existing complete Stage 3 implementation, narrow prompt/presentation refinements, additive weekly migration, unit/integration/browser tests, gated historical acceptance harnesses and original synthetic/genuine evidence. It does not introduce a new milestone or change AI limits.

## Pre-commit inspection

- Reviewed tracked changes and new weekly modules, API route, component, migration, scripts and associated tests/evidence.
- Checked all 63 initially proposed files for accidental environment/generated paths, API-key-shaped values, private keys and credentialed remote PostgreSQL URLs. No matches. Local fixture credentials are synthetic; real credentials remain ignored.
- Build output, generated Prisma client, node_modules, local PostgreSQL files, environment files and transient verification snapshots are excluded.
- Corrected the development-boundary document's stale pre-migration sentence to distinguish completed local verification from production. Marked the previous release audit as a historical pre-commit snapshot.
- Preserved complete original model responses and their recorded metrics. No new model outputs were generated.

## Fresh verification before commit

| Check | Result |
| --- | --- |
| `npm test` | 266 passed, 51 skipped; 30 passing and 17 opt-in skipped files |
| `npx vitest run tests/advisor-postgres.test.ts tests/advisor-weekly-postgres.test.ts` | 4 passed across 2 files; isolated local database and fixture AI |
| `npm run lint` | Passed, exit 0 |
| `npm run build` | Passed, exit 0; Prisma generation, Next compilation, TypeScript, static generation and route tracing |
| `npm run typecheck` | Passed serially after build, exit 0 |
| `git diff --check` | Passed |

Application tests, lint, TypeScript and build passed on their first checkpoint attempt. The first staged diff check found an extra blank line at EOF in the release audit and historical live-test harness (previously untracked); only those trailing blank lines were removed and the staged check then passed. No safeguard was bypassed. The build used approved local filesystem permission from the outset. Opt-in paid/external and other database tests remain skipped, not represented as passed. No browser test was rerun; saved browser evidence remains historical.

Integration target: only `127.0.0.1:55441/firstcustomers_advisor_dev`, role `firstcustomers_test`, with synthetic accounts and local fixture responses. No migration ran. The temporary local fixture server was stopped after verification.

## Remaining release gates

- Latest refined weekly prompt has no new real-model acceptance output; the prior two-call/$0.15 audit was blocked by unchanged token reservations. No paid tests ran for this checkpoint.
- Latest initial-report contract has offline regression coverage but lacks a confirmed successful genuine live acceptance result.
- Production configuration, database migration state/target, hosting duration support, identity/recovery delivery and rollback prerequisites remain unverified as described in the historical release-readiness audit.
- This commit is local only. GitHub integration, production migration, deployment and paid testing require separate approval.

The original main worktree is preserved. The checkpoint commit is identified by this file's introducing commit; use `git log -1 -- docs/stage-3-release-candidate.md` to retrieve its SHA without embedding a self-referential hash.
