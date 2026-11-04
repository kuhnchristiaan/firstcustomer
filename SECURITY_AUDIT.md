# Workspace credential audit — 4 November 2026

## Scope and findings

Audited only the FirstCustomers workspace. No Neon CLI, management API, new API keys, MCP setup, global agent configuration changes, or EDUCERT access were used during this audit. The owner's reported key revocation and global integration removal were not independently revalidated against the Neon account.

- No Neon account-level key assignment, literal bearer credential, or private environment-secret copy was found in application source, workspace configuration, logs, or generated build artifacts.
- No workspace MCP configuration was found.
- `.env.local` contains legitimate FirstCustomers PostgreSQL credentials, OpenAI configuration and application secrets. Their values were not displayed, modified, rotated or copied.
- `.env.example` contains placeholders and public configuration, not deployed credentials.
- One exact value match in `tests/guest-security.test.ts` is Cloudflare's publicly documented Turnstile test credential. It is intentionally used for tests and rejected by production guest configuration; it is not a private key or Neon credential.
- `.neon` holds project/branch identifiers, not API credentials, and is ignored.
- The Git index currently contains no tracked files. All untracked application/configuration files were also scanned, so the check was not limited to the index. There is no committed application history to inspect.

A text/pattern scan covered 390 readable files. A second streaming scan covered 494 files including 15 large generated artifacts, comparing private environment values internally without printing them. Dependency vendor files, Git internals and PostgreSQL binary data were excluded; workspace logs and `.next` artifacts were included.

## Remediation and preservation

- Added explicit security boundaries to `AGENTS.md`: no Neon key creation or MCP configuration, no EDUCERT access, no printing/copying secrets, and validated FirstCustomers-only provider targets.
- Removed the copy-pastable account-wide initialization command and obsolete key identifier from `NEON_SETUP.md`; marked that setup as superseded by the owner's revocation/removal.
- Retained existing `.env*` ignore rules, with only `.env.example` excepted. Added ignores for logs, private key/certificate containers, `.secrets`, credential files and local MCP JSON files.
- Preserved all legitimate environment files and connection credentials unchanged. No resources or data were deleted.

Verified `.env`, `.env.local`, `.env.production`, `.env.development.local`, `.neon`, and local acceptance artifacts are ignored. No credential-bearing path is tracked. Values are intentionally omitted from this report.

## Subsequent development

After the audit, the tested additive Milestone 2 migration was applied only to the verified existing FirstCustomers database through its stored direct connection. Existing analysis records were preserved. Only `STRATEGY_REFINEMENT_ENABLED=true` was added to ignored `.env.local`; all pre-existing environment values were compared and preserved. No account-wide API credential or MCP setup was used. No EDUCERT resource was accessed.

Final post-development scan: 486 non-vendor workspace files, including new build artifacts and logs, contained no copies of private environment credentials outside `.env.local`. Git ignore checks also passed for credential/key/MCP file examples.
