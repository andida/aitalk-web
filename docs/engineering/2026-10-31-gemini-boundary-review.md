# Gemini provider response boundary review (2026-10-31)

The Gemini-only changes and shared validators were selected from the external
AI review delivery `2026-10-30-pro-ai-lint-delivery.zip` (105176 bytes,
SHA-256 `065d0f18d2f3f5a3752707a0cb4647eca65520d3ac477bb9abdd3430e082f0df`).
Its source archive baseline was commit
`3bcef9af9a83016e756a7a4b08c8c0ee43e0300b` plus the then-current local
changes, SHA-256
`b233b600f42f36a62b259e89f077a9dd450f30340b28b1d11b4cde9e009b29ea`.
The associated conversation is
https://chatgpt.com/c/6ae49dd0-fc10-83ec-a0fa-c8bfd3d8a396.

The patch was applied to an isolated Git worktree after checking the actual
local source. The independent Gemini subset passed 24/24 offline mocked
provider/storage contract tests, including comparisons against the provided
baseline. The TAP output is `2026-10-31-gemini-contract-tests.tap`. Two
project regression tests exercise shared object/string/array guards; they do
not substitute for the provider contract suite. A dependency-complete isolated
candidate passed TypeScript. The tested Gemini and validation source SHA-256
values were `6f054e5c28ab5bb32c495dfac82600f01bb85bd38ed9cd17835d400e69b51f9e`
and `fb69f53ab64bb11f5150eba303db00c9fbb458dc23c5f41d1a2be6b26e4685e3`.
The Gemini changes validate response structures; malformed input can now be
rejected deliberately. No real Gemini, storage, database, or production call
was made.

After application, workspace tests passed 89/89 and `git diff --check` passed;
lint reported 71 errors and 198 warnings. The dependency-complete isolated
candidate passed TypeScript and the complete OpenNext build. The workspace's
dependency installation remains out of sync with its manifest, so the isolated
type-check result must not be described as a passing workspace type check.

Important unresolved risk: if the Gemini provider is enabled, the authenticated
AI generation route passes user-provided `options.image_input` into server-side
`fetch` without a demonstrated safe-origin, redirect, DNS/IP or network-egress
boundary. The retained fetch behavior may permit server-side request forgery;
whether a target is reachable depends on deployment/network configuration. This
patch does not resolve or production-test that risk. The separate AI-credit and
payment correctness concerns also remain unresolved. Do not use these tests as
a release approval.

An independent fixture supplied `http://127.0.0.1:9999/private` as the
reference image and confirmed that the Gemini adapter passed that exact URL to
the harness's mocked fetch. The mock returned 404 and no real network request
was made. This demonstrates the missing application-level destination check,
not reachability or exploitation in the deployed environment.
