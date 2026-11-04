# Milestone 4 — FirstCustomers brand and interface

## Identity

The identity centres on a first connection: an open F-shaped path ending at a coral signal node. The mark is original SVG, not a stock compass or target. Its squared structure carries into the interface, with restrained rounding reserved for controls and grouped surfaces. The wordmark uses Instrument Sans with a small terminal dot. The mark works at favicon size, in the header, on dark surfaces and as a square social asset.

| Token | Value | Role |
|---|---|---|
| Ink | `#171C27` | Text, primary actions, marketing and auth surfaces |
| Paper | `#F8F7F3` | Main light workspace/background |
| White | `#FFFFFF` | Forms, messages and grouped surfaces |
| Signal lime | `#D6F36A` | Main marketing action, selected priorities, brand emphasis |
| Action coral | `#F16B53` | Connection node and next-action indicator |
| Slate | `#68717D` | Secondary palette colour |
| Muted text | `#5E6773` | Readable supporting text |
| Neutral border | `#DFE2E4` | Non-interactive separators |
| Control border | `#818A97` | Form/outline control boundaries |

Typography: locally hosted variable Instrument Sans for display and headings; variable Inter for interface text and reports. Both are SIL OFL licensed, with licenses beside the WOFF2 files. The assets are subset to Latin/extended Latin, common punctuation, arrows and currency symbols, with system fallbacks for other scripts. Combined font assets are approximately 222 KB. Next.js `next/font/local` loads them without browser requests to Google. Sources: Google Fonts' official Instrument Sans and Inter repositories.

Tokens cover colours, semantic states, spacing, typography, container/reading widths, radii and motion. Controls use a 5px radius, grouped surfaces 9px, with minimal shadows. Colour transitions are 160ms and reduced motion is respected. There is no new component library, dark workspace theme, or decorative animation system.

## Implemented surfaces

- Homepage: bold editorial composition, the preserved headline, prominent guest website form, reserved verification space, reassuring recovery states and an explicitly illustrative Launchboard strategy showing a target, a 45-minute experiment, a positive result and a decision rule. Supporting sections explain the audience, outcome and evidence limitations.
- Shared branding/navigation: SVG mark, favicon/social symbol, self-hosted fonts, skip link, accessible buttons and forms, consistent footer and focus states.
- Workspace and products: desktop sidebar/mobile navigation using only existing routes, compact truthful usage summaries, product rows, an empty state and a next action from the approved refined strategy when present. All additional approval reads remain tenant-scoped. Existing ownership and server authentication checks remain intact.
- Reports: dedicated first-move presentation, semantic customer segments, channel experiments, a nine-factor comparison table, message blocks with copy controls, four compact weekly timelines, clear founder context and existing revision/edit/approval controls. Unknown objects retain an editable labelled fallback for schema compatibility. Substantive fields are preserved, not replaced by decorative summaries.
- Authentication and support: consistent sign-in, registration and recovery shell; privacy, terms, support, not-found and error surfaces. No authentication methods or email workflows changed. No account-settings route was invented.
- Print: separate `print.css`, A4 margins and Letter compatibility, lighter report-specific presentation, expanded supporting details, compact schedules/comparisons, hidden chrome/controls and conservative page grouping. A small native beforeprint/afterprint helper opens closed details and restores their prior state for browsers without `::details-content` support. Browser print headers/footers remain user-controlled.

## Main files

- Foundation: `src/app/globals.css`, `src/app/print.css`, `src/app/layout.tsx`, `src/app/fonts/`, `src/app/icon.svg`, `public/brand-symbol.svg`, `src/components/brand.tsx`, `src/components/ui/button.tsx`.
- Marketing/workspace/auth: homepage, dashboard, product, preview and auth route files; `workspace-shell.tsx`, `site-navigation.tsx`, `url-form.tsx`, `turnstile.tsx`.
- Reports: `report.tsx`, `progressive-report.tsx`, `strategy-presentation.tsx`, `segment-comparison.tsx`, `print-support.tsx`.
- Verification: `tests/design-system.test.tsx`, `e2e/redesign.spec.ts`, `playwright.config.ts`, `scripts/ui-server.mjs`, `scripts/ui-fixtures.mjs`.

## Verification

Browser fixtures use fake credentials and browser-intercepted API/verification responses. The workspace is rendered from the real presentation components with synthetic data; it does not represent a real signed-in account. The refinement/guest screens use browser-only mock responses through the actual UI. No test routes, auth bypasses or fixture data are deployed by the app.

The separate `.next-ui-qa` output directory keeps QA independent of the existing dev server. Test assets, traces, screenshots and PDFs are ignored under `artifacts/ui`, `test-results` and `playwright-report`. Two dev-only packages provide Playwright and axe checks; there are no new paid or runtime services.

Responsive coverage: 320, 375, 390, 768, 1024 and 1440 pixels for homepage, sample, sign-in, sign-up, refined report and workspace fixture. Tests check document overflow and browser exceptions at each width. Automated WCAG 2/2.1/2.2 A/AA scans run on selected 390/1440 layouts and narrow recovery/legal/error pages. Other checks cover keyboard skip navigation, password visibility, copy feedback, URL retention after a recoverable failure, guest retry, context editing, revision switching, reduced motion and print expansion/restoration.

Contrast calculations: ink/paper 15.90:1; white/ink 17.05:1; lime/ink 13.71:1; muted/paper 5.35:1; slate/paper 4.61:1; control border/white 3.49:1. Coral is an accent/mark, not small body text. Automated checks and keyboard tests support the accessibility target; they are not a WCAG certification.

The synthetic refined fixture exports to 8 A4 pages and 9 Letter pages, with no blank pages. Visual inspection covered the rendered pages, including the first move, matrix, effort breakdown, founder context, weekly schedule, messages and source/assumption sections. Page count varies with actual report content. Initial QA found/fixed wrapped step numbers, fixture encoding, a low-contrast print heading, weak control borders and overly tall factor lists. A development-router race disappeared against the production build; the final browser suite uses production assets.

Final results:

| Check | Result |
|---|---|
| `npm run build` | Passed, including production TypeScript compilation |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test -- --maxWorkers=1` with isolated PostgreSQL | 137 passed, 3 opt-in tests skipped |
| `npm run test:ui` against final production assets | 42 passed |
| Selected automated accessibility scans | No violations reported by axe for the configured WCAG tags |
| A4 / Letter fixture exports | 8 / 9 pages, no blank pages |

The full database regression run includes guest claiming, tenant isolation, immutable history, quotas, approvals and failed-generation preservation. Three opt-in real-network/AI tests remain skipped. No fresh paid report or real account mutation was used for this visual milestone.

Visual artifacts are in `artifacts/ui/`: `homepage-preview.png`, full desktop/mobile `homepage`, `sample`, `sign-in`, `sign-up`, `workspace` and `refined` screenshots, `workspace-empty.png`, `refined-first-view.png`, `refined-A4.pdf` and `refined-Letter.pdf`. Verification widgets and account/report data shown in QA artifacts are labelled synthetic fixtures.

## Local QA reproduction

1. `npm run ui:build`
2. In another terminal, `npm run ui:serve`
3. `npm run test:ui`

Windows uses installed Microsoft Edge; other platforms use Playwright Chromium (install it with `npx playwright install chromium`). QA runs on localhost:3100 and is intentionally configured with fake credentials. Actual Turnstile and real account actions must use the normal application environment. PDF inspection tooling was temporary and is not an application dependency.

## Remaining manual verification and scope

- Test real Turnstile, email delivery, sign-in, registration and guest-to-account claiming after an approved deployment. Existing automated domain/backend tests pass, but mocked browser fixtures do not prove live provider integration.
- Review on physical iOS/Safari and Android devices and with a screen reader. Edge/Chromium was the browser engine tested here.
- Inspect a long real report in the user's native print dialog, with their chosen paper size, printer and browser header/footer settings. Native print events provide a compatibility fallback, but Safari/Firefox printing was not exercised.
- No database migration, DNS change, Vercel/Neon configuration change, environment-secret change, paid feature or production deployment belongs to this milestone. EDUCERT resources were not accessed. Historical report schemas remain unchanged.
- Work remains local for review; pushing main would trigger the existing deployment workflow and requires the user's explicit approval for this milestone.
