# Provider type cleanup batch (2026-10-31)

Starting from 113 ESLint errors and 199 warnings, this batch replaced explicit
`any` declarations in raw AI/payment results, provider configuration,
metadata and request builders with `unknown`, inferred types, or the
string/number/null metadata value shape required by the installed Stripe SDK.
The touched providers are Creem, PayPal, Kie, Fal and Replicate. This is a
compile-time change; it does not add runtime validation of external inputs.

TypeScript `transpileModule` comparisons for each changed source file showed
byte-identical emitted JavaScript against its pre-change counterpart. The
dependency-complete isolated candidate passed `tsc --noEmit`; the main
workspace's type check failed because installed dependencies/generated docs do
not match its concurrently modified manifests and lockfile. The workspace's
`test:aitalk` passed 81/81 and `git diff --check` passed. Lint reported 84
errors and 199 warnings, so it did not pass. The final batch also passed an
OpenNext build in the dependency-complete isolated candidate.

No payment provider, AI provider, live database, or production account was
contacted. Type declarations are not input validation and do not resolve the
previously identified payment, AI task, D1 transaction, or concurrent credit
risks. No deployment was made.
