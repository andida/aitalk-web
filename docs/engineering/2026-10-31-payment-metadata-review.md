# Payment metadata boundary review (2026-10-31)

Provider metadata is now represented as unknown until read. The payment notify
route looks up an order only when `order_no` is a nonempty own string property;
missing, inherited, non-string, array and inaccessible values are rejected.
The existing behavior remains: checkout-success with no usable order number
returns an error; one-time payment-success without one is acknowledged without
looking up an order. Checkout and notification exception handlers also safely
report an unknown fallback for errors without a readable string message. The
AI options interface was also narrowed to a record, without adding runtime
validation.

The candidate was applied and checked in an isolated Git worktree, and the
same source passed TypeScript in a dependency-complete isolated candidate. The
offline mocked caller harness executed 15 focused route checks (9 malformed
metadata/notification checks, 4 existing valid/error-flow checks, and 2 null
exception checks); TAP evidence is in the three adjacent
`2026-10-31-payment-*.tap` files. Unit tests include inherited keys, null,
non-string values, revoked proxies and throwing property access. No real
provider, real order, live database or network was accessed. The workspace's
`test:aitalk` passed 92/92 and `git diff --check` passed. Lint reported 63
errors and 198 warnings and did not pass. The isolated candidate's full
OpenNext build also passed; this was not a production deployment.

The PayPal and Creem exception handling was subsequently narrowed from `any`
to unknown and the shared error-message reader. Six offline provider checks
passed: both known PayPal missing-order codes still use subscription lookup;
null, non-string and unrelated errors do not; and Creem safely handles a
non-Error signature exception. The executed test source and TAP output are
preserved in the adjacent `2026-10-31-payment-provider-errors` files. These
tests use stubbed methods and blocked network, not real payment providers.

After these provider changes, workspace lint reported 61 errors and 198
warnings; the isolated candidate passed TypeScript and an OpenNext build, and
workspace tests passed 92/92. An unused empty `EventInfo` interface was then
removed from this private application after confirming no repository references;
its removal produces identical emitted JavaScript. The final lint count was 60
errors and 198 warnings, the isolated TypeScript check passed again, and project
tests remained 92/92. The full build was not rerun after this type-only removal.

This is not a complete payment security fix. In particular the previously
identified possibility of client metadata overriding server-owned identifiers,
provider/order/amount identity checks, failure-order state, and D1 transaction
semantics remain unresolved. The mock checkout test confirms the existing
failure path still marks an order COMPLETED; it is evidence of existing
behavior, not an endorsement of that behavior. Do not release on the basis of
these tests.
