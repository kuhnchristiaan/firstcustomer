## FirstCustomers security boundaries

- Never create Neon API keys or configure/install MCP integrations.
- Do not run Neon onboarding/init commands that mint keys or modify agent integrations.
- Never access or modify EDUCERT infrastructure, data, credentials, or resources.
- Keep legitimate FirstCustomers credentials in ignored environment files. Never print secret values or copy them into source, configuration, reports, or logs.
- Limit provider operations to explicitly authorized FirstCustomers resources. Validate migration targets and preserve existing reports.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
