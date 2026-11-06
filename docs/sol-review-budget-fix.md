# Sol quality-review allowance correction

Implemented locally after the genuine review exhausted 650 output tokens (277 reasoning tokens included), leaving its structured review incomplete. No new paid call was made for this correction.

Sol quality reviews now request up to 1,500 output tokens. Its single bounded repair requests up to 1,000 and reserves another 1,500 for the required final review. Both initial reports and founder-refinement quality gates use these allowances. Legacy model allowances remain unchanged. No model truncation is converted into success and no retry is added.

Initial-report generation reserves two review allowances plus one repair before requesting generation output. Requests remain clamped by actual remaining aggregate tokens, including all reasoning output. Regression coverage exercises the worst-case full path: 1,200 identification + 2,800 generation + 1,500 review + 1,000 repair + 1,500 final review = 8,000 tokens. Another regression confirms incomplete review rejection after exactly three calls without publication or retry.

The Sol default and example initial-report output configuration use the existing allowed 8,000-token aggregate ceiling; explicitly configured smaller limits remain in force. The previously inherited 4,500-token Mini default was insufficient to reserve these Sol stages. Aggregate input remains 20,000 by default. Conservative Sol token-only cost at 20,000 input/8,000 output is $0.13 ($2.50/$10 per million), within the earlier $0.20 evaluation ceiling; this is not authorization to run another evaluation. Founder time/spend constraints, per-account quotas, quality thresholds, evidence rules and one-repair behavior are unchanged.

Verification: 272 tests passed, 51 opt-in skipped; ESLint passed; production build passed. Standalone post-build TypeScript verification also passed. An older output-exhaustion regression initially inherited the new Sol default; it now explicitly selects Mini to preserve its original legacy ceiling assertions, with separate Sol boundary coverage.

No production changes, migrations, infrastructure changes, paid calls, deployment, merge or push. Changes remain local and uncommitted. Previous genuine failures remain preserved. The corrected allowance has offline transport coverage only; complete accepted live output remains unverified and requires separate paid-test approval.
