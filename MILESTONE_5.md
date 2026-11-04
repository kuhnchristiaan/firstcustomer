# Milestone 5 — Product attribution, printing and final refinement

Implemented locally on 4 November 2026. **No production deployment, push, DNS/auth-domain change, database migration, credential change or cloud-infrastructure change.** No EDUCERT resources were accessed. Existing secrets and generated QA artifacts remain ignored.

## 1. Investigation and root cause

The former extractor flattened the entire main element into one string. It removed navigation/scripts but discarded section context, so a fictional example and the owner's product description reached the same interpretation call. Website evidence validation checked that a URL was fetched; it did not require a relevant passage or the subject of a claim. Refinement then reused that initial assessment and an arbitrary source prefix. This is a confirmed contamination path and supports the Launchboard hypothesis. The exact historical production generation was not retrieved, so its individual model decision cannot be proven.

| Pipeline stage | Finding / resulting behavior |
|---|---|
| URL submission and validation | Existing URL normalization, origin checks, public-network DNS pinning and SSRF protections retained. |
| Crawl | Existing robots, page/time/content bounds retained. Only product/about/feature/pricing links are considered. No unrestricted web research. |
| Extraction and cleaning | Version 2.0 evidence documents preserve block IDs, text, semantic context and classification. Metadata and bounded JSON-LD are data, never instructions. Unscoped Product metadata inconsistent with page branding is ambiguous. |
| Content classification | Owner candidates, illustrative content, third-party statements, editorial material and ambiguous text remain distinct. Section/heading/ARIA context and generic semantic markers establish scope; unsectioned sample headings also work. No company-name exception or onboarding/trial blacklist. |
| Product interpretation | A separate bounded structured selection identifies the owner, capabilities and primary job. The model selects eligible block IDs; the server supplies exact quotes and URLs. Ambiguous identity fails closed. |
| Product intelligence | Report 1.1 contains a versioned product profile. Owner claims, observable website statements, inference and unknowns have separate classifications. Category and primary job are explicitly AI interpretations. |
| Evidence | Every published website-supported product statement binds to an owner passage and exact quote. Unsupported paraphrases cannot inherit verification from a real URL. Marketing claims are publisher claims, not independent proof. |
| Initial strategy | Receives the attributed owner profile rather than raw demonstration text. Five recommendation families reference supported owner statement IDs. Unverified advice does not acquire evidence links. |
| Refinement | Candidate and critical review use the same immutable attributed profile and deduplicated owner quotations. Historical recommendations are untrusted prior output. Legacy reports retain a visible attribution limitation. |
| Persistence / caching | Evidence documents use the existing WebsiteSource content column; profile and basis use existing JSON report storage. No schema migration. No cross-customer result cache was found; short duplicate-request suppression remains. Immutable source runs and revision history are preserved. |

The legacy 1.0 schema remains readable. Existing reports are not silently rewritten: generate a fresh analysis to benefit from the new extraction and attribution. Approval rejects profile tampering, unknown recommendation references and downgrading a 1.1 report to bypass provenance checks. Editable strategy sections continue to save as new versions.

## 2. Code and prompt changes

- `src/modules/website/{document,classify-html,extract}.ts`: classified, bounded extraction and persisted block provenance, including hashes of the actual stored content.
- `src/modules/intelligence/{product-profile,attribution,schema}.ts`: strict product selection, server-bound quotations, recommendation basis, supported-claim grounding and backward-compatible report 1.1.
- `schemas/sales-strategy.v1.1.json`: reviewable JSON schema snapshot.
- `src/modules/analysis/{provider,service}.ts`: two bounded initial stages and provenance-aware approval.
- `src/modules/strategy/{provider,service}.ts`: shared owner context for generation and review, concise prompts and deduplicated evidence. No AI retries or unbounded loops were added.
- `src/components/{evidence,report,progressive-report}.tsx`: quoted publisher evidence, a single numbered source list, AI-interpretation wording and legacy attribution notices.
- Homepage: the existing headline, charcoal/lime identity, logo, navigation, primary CTA, guest submission and responsive structure remain. A compact illustrative first move now balances the desktop hero and states segment, action, time and success criterion. Both example areas have semantic illustrative markers.
- `src/app/print.css`: explicit A4 portrait preference, printable-width containers, less padding, full-width supporting sections, natural breaks, repeated headings protection and no interactive/navigation controls. Important assumptions and evidence still print.
- `src/lib/turnstile-sdk.ts` and `src/components/turnstile.tsx`: retryable script loading, 15-second download timeout, 45-second stalled-check recovery, expiry/error/offline handling and accessible status messages. URL state remains in the parent form. Only a real widget success callback enables submission; server verification is unchanged.

The initial profile/report stages share the existing total input/output ceiling. Both calls' actual usage is aggregated, including known usage on failures. Refinement keeps its existing 38,000 conservative input bound and 9,000 output ceiling. Repeated evidence initially exceeded this bound during live QA; compact owner context and deduplicated quotes resolved it without increasing the limit. No new paid service was introduced.

## 3. Product accuracy verification

The real public `https://www.firstcustomers.app/` was crawled (one page, bounded content) and analyzed with the real OpenAI provider, without database/account access. Final initial analysis passed and identified:

> FirstCustomers — Customer acquisition. Solo founders and small SaaS teams need help identifying and reaching first customers efficiently.

The stored summary is an exact website passage describing website-based SaaS sales strategy, three customer profiles, acquisition experiments and a 30-day plan. Recommended segments concern founders finding customers. It does not identify FirstCustomers as an onboarding analytics provider or treat Launchboard as its product.

Final initial live run: **3,995 input / 2,656 output tokens** across both stages. A real refinement of an attributed FirstCustomers report also passed: **5,595 input / 2,394 output tokens**, schema 3.0, unchanged source profile. Its first move offered a website-based sales strategy to SaaS founders. These were opt-in local provider checks, not production report submissions.

Deterministic regression fixtures cover FirstCustomers/Launchboard and unrelated LedgerLane/MealGarden (invoice reminders versus athlete nutrition). Assertions inspect block classifications, exact quote binding, supported IDs, structured product jobs, segment problems, acquisition actions, provider inputs and initial/refined consistency. They do not rely only on matching words in generated prose. Additional tests cover third-party quotes, editorial/demo routes, unsectioned sample headings, ambiguous metadata, fabricated quotations, unsupported references and legitimate onboarding products.

Classification and primary-job interpretation still involve semantic judgement; they are not proof of every site's capabilities. Poorly structured or ambiguous sites may be refused rather than confidently misidentified. Recommendations remain hypotheses requiring founder review and real customer validation.

## 4. Actual PDF verification

All listed PDFs were generated by desktop Google Chrome through Playwright, parsed for dimensions/text boundaries and rendered to page images with PyMuPDF. The comparison uses the same existing full refined fixture before and after the CSS changes, not the user's unavailable Android PDF.

| Export | Before | After |
|---|---:|---:|
| Full refined, A4 portrait | 8 pages | 7 pages |
| Full refined, US Letter portrait | 9 pages | 7 pages |
| Initial report, A4 | Not captured | 6 pages |
| Attributed initial report, A4 | Not applicable | 7 pages |
| Short report, A4 | Not captured | 1 page |
| Longer stress fixture, A4 | Not captured | 10 pages |
| Full refined at 390px screen viewport, A4 | Not captured | 7 pages, identical text/pagination to desktop |

A4 dimensions: 595 × 842 points; Letter: 612 × 792 points. Letter was exercised with a Letter page-size stylesheet override in Chrome's PDF renderer. All substantive text remains inside page boundaries; no blank pages. Page images were inspected for hierarchy, table/card width, continuation and preserved assumptions. Supporting sections can flow across pages rather than keeping oversized groups together. A short final page can still occur depending on content length; pagination is not fixed to a promised page count.

One decorative middle-dot glyph in the synthetic title has an anomalous extracted font bounding box; it renders correctly. The PDF verification script excludes that specific non-body glyph from boundary assertions, not substantive report text.

**Orientation finding:** the desktop baseline was already portrait. Android/browser-selected landscape remains an unconfirmed cause. CSS requests portrait but cannot promise to override printer-dialog choices. No connected Android device was available (`adb` found zero devices), so physical Android printing is unverified.

Artifacts under ignored `artifacts/ui/` include before PDFs, after PDFs, page renderings, `pdf-verification.json`, desktop/mobile homepage and report screenshots, and cropped founder-questionnaire screenshots. `scripts/check-report-pdfs.py` makes the PDF checks reproducible with PyMuPDF QA tooling.

## 5. Responsive and Turnstile verification

Chrome checked 320, 375, 390, 768, 1024 and 1440px: homepage, sample, sign-in, registration, report, workspace and open founder questionnaire. Checks cover document overflow, runtime errors, navigation, copy controls, revision selection, retained input, accessibility and keyboard/password controls. Automated WCAG scans at 390/1440px found no violations in the tested fixture pages; supporting recovery/legal pages were also scanned at 320px. This is viewport testing, not a claim of physical Android coverage.

Local SDK fixtures exercise success, expired token, callback error, challenge timeout, script download failure, stalled verification and offline/online recovery. Server tests continue to reject absent tokens, unsuccessful checks, wrong host/action and production test-key/local-IP bypasses. Fixtures exist only in tests and intercept the browser SDK locally; production verification is never mocked.

Passive canonical-production check: HTTP 200, correct homepage, one real Cloudflare frame loaded. After eight seconds, status remained “Complete verification to generate your strategy” and submit remained disabled. No challenge was clicked and no report was submitted. Initial `networkidle` waiting timed out because the widget keeps network activity open; a DOM-loaded observation completed. This confirms loading and fail-closed behavior, **not** completed real human verification.

## 6. Regression and build results

- Complete isolated PostgreSQL suite: **148 passed, 5 opt-in live checks skipped; 19 test files passed.** Includes guest ownership/claiming, tenant isolation, quotas, persistent strategy versions/approval, source immutability and password recovery contract tests.
- Chrome: 47 main tests passed; six additional founder-questionnaire width checks passed (53 distinct checks).
- Seven actual PDF variants passed dimensions, substantive text boundaries, no-blank-page and desktop/mobile print consistency checks.
- Real initial analysis and real attributed refinement passed independently with the limits above.
- **`npm run build`, `npm run typecheck`, `npm run lint` and `git diff --check` passed.** The final build compiled successfully, generated all 19 static pages and completed route tracing.

During development, invalid model quotations/unsupported evidence and over-budget refinement were safely rejected and corrected. A new test mock initially returned an inconsistent critique verdict, and legacy authorization mocks omitted the now-read original output; fixtures were fixed. Sandbox network and generated-directory permission failures were rerun with appropriate local test access. These are recorded failures, not suppressed test passes.

## 7. Before production deployment

1. Approval is still required before any production deployment.
2. In a real Android Chrome browser on the canonical domain, complete the Turnstile challenge and confirm submit becomes available. Test refresh after expiry/network loss. Do not bypass it.
3. After an approved deployment, generate one fresh FirstCustomers report and inspect its owner quotations, product job and recommendations. Existing potentially contaminated reports need a fresh analysis; immutable histories remain.
4. Print that report on Android using A4 portrait, then Letter if needed. Check the phone's orientation, paper and scaling settings; application CSS cannot control every printer setting.
5. Complete a real guest report → registration → secure claim → edit/save → refinement flow with your own account, and check recovery email delivery. Domain services and recovery contracts are tested; no new real account/email transaction was performed in this milestone.

Production remains unchanged. No cloud or authentication-domain adjustment is needed for these code changes.

### Captured command summaries

```text
npm test -- --maxWorkers=1 (isolated localhost PostgreSQL)
Test Files 19 passed | 4 skipped (23)
Tests      148 passed | 5 skipped (153)

UI_BROWSER_CHANNEL=chrome npm run test:ui
47 passed (56.9s)
Additional founder questionnaire suite: 6 passed (13.7s)

python scripts/check-report-pdfs.py
verified: 7 PDF variants

npm run build
Compiled successfully in 5.8s
Generating static pages (19/19)
Exit 0
npm run typecheck — Exit 0
npm run lint — Exit 0
git diff --check — Exit 0
```

### Review artifacts (local, ignored)

- [Desktop homepage](artifacts/ui/homepage-1440.png)
- [Mobile homepage](artifacts/ui/homepage-390.png)
- [Mobile refined report](artifacts/ui/refined-390.png)
- [Mobile questionnaire](artifacts/ui/founder-context-390.png)
- [Desktop questionnaire](artifacts/ui/founder-context-1440.png)
- [Refined A4 PDF](artifacts/ui/refined-A4.pdf)
- [Refined Letter PDF](artifacts/ui/refined-Letter.pdf)
- [Attributed report PDF](artifacts/ui/attributed-A4.pdf)
- [Before A4 PDF](artifacts/ui/milestone5-before/refined-A4.pdf)
- [Before Letter PDF](artifacts/ui/milestone5-before/refined-Letter.pdf)
- [Passive production Turnstile screenshot](artifacts/ui/production-turnstile-passive.png)

## Follow-up: signed-in Plausible report failure

Production `/api/analyses` logs showed three `analysis_output_rejected` events with `reason: input_budget` during the reported test. The initial M5 real-provider check used guest limits (30,000 input / 6,000 output), missing the smaller signed-in default (20,000 / 4,500). Detailed product evidence plus repeated inline schema definitions could exceed that conservative combined bound after the first AI call. The original error handler then replaced this specific cause with a generic message.

Fix implemented locally:

- Use the installed OpenAI SDK's strict schema converter with shared claim, recommendation and experiment definitions. The base report schema is 4,390 bytes versus 8,513 inline; no constraints are removed. A recursive-reference expansion regression proves schema equivalence. [Official structured-output reference](https://developers.openai.com/api/docs/guides/structured-outputs).
- Reuse compact owner context for initial generation and refinement. Exact publisher statement text and supported IDs stay in model input; full quote/URL/block provenance stays in the immutable persisted profile and server-side grounding checks.
- Keep all existing token/cost limits. A detailed four-claim fixture now fits within 20,000 conservative input units, while the reconstructed previous request representation exceeds it. Total output allocation remains 4,500.
- Map budget and identity uncertainty failures to actionable, safe messages in both the API response and failed run record. Known billed usage remains recorded; successful historical reports remain unchanged.
- Ignore desktop remote attachments so the user's screenshot cannot be included accidentally in Git.

A real crawl and two-stage OpenAI analysis of **https://plausible.io/** succeeded using signed-in default limits: one source, 4,088 extracted characters, **3,033 input / 2,483 output tokens**. Result: Plausible Analytics, Product analytics; quoted evidence and recommendation basis validated. No production account or report was mutated. The result is retained only under ignored `.local-live-test/`.

Verification: **151 tests passed, 6 opt-in checks skipped**, with isolated local PostgreSQL; a strengthened previous-over-budget regression also passed separately. `npm run build`, `npm run typecheck`, `npm run lint` and `git diff --check` passed. No frontend layout changed, so the already completed responsive/PDF checks were not repeated. No secret values were printed; no Neon, DNS, auth-domain or EDUCERT changes were made. The user approved committing, pushing and redeploying the follow-up fix. Production readiness is checked separately against the resulting Vercel deployment.

## Follow-up: stale dashboard states and processing notices

A narrowly scoped, read-only query of FirstCustomers application runs for Plausible and Senja confirmed the newest Plausible run **SUCCEEDED in about 23 seconds** after the previous deployment. Senja's visible failed attempts predated that fix. There were no active refinement rows for those two products at inspection time. No report content, EDUCERT rows, account data or infrastructure was accessed or modified by this diagnostic. The screenshot therefore did not establish a permanently stuck production job: it showed an older failure while another request was in progress, followed by a dashboard that did not refresh its state.

Confirmed presentation bug: every unapproved product was given “Ready for your review,” including FAILED and RUNNING attempts.

Local remediation:

- Failed, building, successful and not-yet-analyzed rows now have distinct descriptions. A failed re-analysis explicitly preserves the availability of an earlier approved strategy.
- Visible active workspaces refresh server state every five seconds; completed workspaces do not poll. Returning to the tab or a browser back-cache page refreshes once. Hidden tabs do not poll. Refreshing preserves typed URL state and never starts a paid analysis.
- The dashboard passes active-run state to the form, disables duplicate submission, and provides a link to the report in progress. A race with another tab returns the machine-readable `analysis_busy` code and refreshes status instead of leaving a permanent red error. The transient busy notice clears after a bounded interval.
- Both dashboard and product history treat RUNNING leases at/beyond their deadline as expired. The product page explains how to retry. Backend running counts explicitly require an unexpired lease; cleanup includes the exact expiration boundary. The real concurrency limit, quotas, tenant scope, source reports and version history remain intact.
- Dashboard analysis summaries select only IDs, statuses and lease deadlines rather than fetching complete report JSON repeatedly.

Verification: **160 tests passed, 6 opt-in checks skipped**, including real isolated PostgreSQL expiry/retry and active-job rejection checks. Additional tests cover failed/approved labels, exact lease-boundary behavior, disabled duplicate submissions with retained URL, visible/hidden refresh behavior, listener cleanup and machine-readable API errors. Production build, TypeScript and ESLint passed. **54 Chrome browser checks passed**, including mobile failed/building/approved row labels, overflow and accessibility. The mobile fixture screenshot is `artifacts/ui/workspace-statuses-390.png`. A generated-directory permission failure was resolved by running the local build with normal filesystem access; a new integration fixture initially reused a unique owner ID and was corrected to use a distinct test owner.

The user approved committing, pushing and deploying these UI/status changes; the resulting production deployment is verified separately. No production database rows were repaired or rewritten: the Plausible report was already successful.

## Follow-up: overly broad “Not established yet” labels

A read-only check of the latest successful Plausible report confirmed that its schema 1.1 product profile retained exact owner quotations and valid block references, but the displayed overview and all four offerings had been saved as Unknown with empty source arrays. The confirmed cause was the existing generic high-risk claim filter: it interpreted “100% yours” and a “1 to 100 percent” measurement range as performance assertions. Removing these sentences caused the previous whole-field/array downgrade to mark even unrelated surviving descriptions Unknown.

Remediation implemented locally:

- Shared quote-attribution matching recognizes exact, previously captured owner-product statements. Those can be retained as publisher claims without implying independent verification.
- Safe product rendering works claim by claim; rejecting one unsupported assertion no longer changes sibling classifications.
- A deterministic compatibility repair recognizes exact outputs of the old sanitizer in overview/offerings and restores their matching publisher quotations and source references in the displayed copy. It does not rewrite immutable report runs or require another AI call. Unrecognized founder edits and genuinely missing information remain unchanged.
- The badge now says **Website claim** for quoted owner assertions, and report copy explicitly explains that these are publisher statements, not independently verified results. Inferences and unknown information keep their separate labels.
- Outreach/recommendation safeguards still remove unsupported performance and compliance promises. No change was made to quotas, AI limits, auth, cloud infrastructure or database credentials. No EDUCERT records or infrastructure were accessed.

Regression coverage reproduces the actual Plausible wording and old persisted Unknown state. Tests verify quote-bound retention, individual sibling handling, compatibility repair, idempotence, original-record immutability, rejected mismatched evidence, retained arbitrary edits and removal of unsupported outreach promises. **165 tests passed, 6 opt-in checks skipped**, including isolated PostgreSQL tests; production and UI builds, TypeScript and ESLint passed. **55 Chrome checks passed**, including the old Plausible state displayed with restored labels and source links on mobile. The exported 8-page A4 portrait fixture was inspected; “Website claim” and the scroll measurement range are present in the PDF. Screenshots: `artifacts/ui/publisher-capabilities-390.png` and `artifacts/ui/publisher-claims-print-page1.png`. The user approved committing and pushing this evidence-label fix to main; the resulting production deployment is verified separately.
