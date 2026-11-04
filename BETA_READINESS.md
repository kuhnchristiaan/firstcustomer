# Beta readiness — 4 November 2026

## Implemented

- Forgot-password and reset-password views use the installed Neon Better Auth SDK methods used by its bundled UI. Recovery requests keep callbacks on the app origin and preserve guest-save intent. Missing/invalid/expired-link guidance, password confirmation, request failure and success states are implemented. The provider remains authoritative for expiry and single-use tokens.
- Password visibility controls, visible 8–128 character guidance, and privacy/terms links at registration.
- Privacy, beta-terms and support routes linked in the footer. Notices describe the actual beta implementation, including retention limitations and the absence of self-service deletion. Support points to the real public GitHub issue tracker with instructions not to post private information. A private support contact and jurisdiction-specific review are still needed before broad launch.
- Abbreviated sample has one H1, unnumbered section names, compact segment cards, concise weeks with expandable rationale, and a decision gate before weekly targets. Outreach messages have copy controls and placeholder reminders.
- Turnstile loading, required, complete, expired, failed and script-error messages. Narrow forms use the compact widget. Re-rendering clears the old client token.
- Shorter generation CTA and variable-time expectation. Inputs remain present after failed attempts.

## Checks

- Local browser: homepage, sample and registration at 320, 375, 390 and 768px. All 12 page/width combinations had document width equal to available viewport width, with one H1. This does not establish questionnaire or generated-report mobile correctness.
- Muted body text (#5a6e67), small label text (#527369) and primary text (#115e59) measured against white at 5.44:1, 5.23:1 and 7.58:1 respectively. This is a limited colour check, not a complete accessibility audit.
- Recovery unit tests check callback scoping, guest intent, password confirmation, provider rejection and invalid-link rendering. They use mocks, create no users and send no email.
- Existing local database tests cover expiry, claiming, revision history and tenant isolation. No new schema migration is required.

## Release checks still required

- Real reset-email delivery, clicking a real token, expiry/single-use and successful password replacement, performed by the account owner.
- One uninterrupted guest analysis through human verification, founder context skip/completion/refinement, registration/email verification, claim/save, refresh and return navigation.
- Generated facts checked against cited source text. EDUCERT was not accessed; the earlier explicit boundary remains in force. Use an authorised FirstCustomers-owned test site.
- Questionnaire and real report mobile checks, full keyboard/screen-reader checks, and regular-browser A4/Letter PDF pagination. Browser automation cannot establish all native print behaviour.

Implementation and mocked tests are not public-launch sign-off. No recovery email has been sent by these tests, and no real password has been changed.
