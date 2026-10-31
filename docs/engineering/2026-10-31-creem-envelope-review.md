# Creem signed-event envelope review (2026-10-31)

After signature verification, Creem webhook JSON is treated as unknown. The
outer event must be an object with a nonempty string `eventType` and an object
payload before dispatch. The original raw event remains in `eventResult`.
This removes four redundant explicit `any` casts without claiming that nested
order, transaction, amount, customer or subscription fields are validated.
The documented event examples use this envelope shape:
https://docs.creem.io/skills/creem-api/WEBHOOKS.

The candidate was checked in an isolated Git worktree and a dependency-complete
candidate passed TypeScript. Twelve mocked signed-event boundary cases passed,
including four dispatch branches, malformed shapes and a wrong signature. Five
additional offline tests exercised real Creem normalization against the prior
valid fixture and signature checks. Their evidence is saved in the adjacent
`creem-envelope-mocked` and `creem-normalization-mocked` files. Three new
repository tests cover a valid signed checkout, invalid signed shapes and an
invalid signature. No provider network, live database, real account or payment
was used. The full workspace test suite passed 95/95 and `git diff --check`
passed; lint reported 56 errors and 198 warnings and did not pass. The isolated
candidate also passed the OpenNext build; this was not a deployment.

## Unresolved subscription-paid discrepancy

Creem's documented `subscription.paid` example contains `last_transaction_id`
but no expanded `order` or `last_transaction`. An independently constructed,
signed local fixture with that shape is rejected by the current provider with
`Unknown Creem session status: active`. The adjacent `creem-paid-gap` test
asserts this known failure; its passing result confirms the defect, not working
renewal. Documentation also describes a transaction lookup at
https://docs.creem.io/skills/creem-api/REFERENCE. No claim is made about actual
deployed event payloads or transaction availability. Before release, design and
test verified transaction retrieval, subscription/amount/currency binding,
idempotency, retries and failure handling; do not infer a payment from a status
alone. Existing payment and D1 transaction risks remain unresolved.
