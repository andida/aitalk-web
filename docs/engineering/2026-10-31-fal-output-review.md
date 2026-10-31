# Fal output-array validation (2026-10-31)

The completed-result image and video arrays and the single-video output were
changed: array entries and truthy single-video values must be objects, and their
URL fields must be strings, null or absent. Falsy single-video values, null and
missing URLs retain their prior treatment; invalid entries are
rejected before storage. The
`AIImage.imageUrl` and `AIVideo.videoUrl` types now reflect the previously
supported null values. Status parsing and failure/refund behavior were not
changed.

An isolated Git worktree and a dependency-complete candidate received matching
source. Eleven offline mocked success/storage/differential contract tests passed
against the original source baseline; output is saved as
`2026-10-31-fal-success-contract-tests.tap`. Four independently injected invalid
image/video cases returned deliberate errors before mocked storage, and a
mocked failed-status case retained its previous behavior. The source harness
is in the previously recorded `2026-10-30-pro-ai-lint-delivery.zip`; no real
provider, storage or database was contacted.

Workspace `test:aitalk` passed 90/90, and `git diff --check` passed. The
dependency-complete candidate passed full TypeScript; workspace lint reported
69 errors and 198 warnings and did not pass. This partial change does not
validate all Fal data: in particular provider status/identity boundaries still
need separate review. Three additional mocked malformed single-video cases
were rejected before storage, and all 11 success contracts were rerun and
passed after that follow-up. Existing AI-credit,
refund, server-side reference fetch and payment risks remain release blockers.

The dependency-complete candidate also passed a full OpenNext build after the
single-video follow-up. The eight independently injected malformed/status
checks are preserved as `2026-10-31-fal-malformed-check.mjs`; they require the
extracted external delivery's mocked harness and an isolated source directory.
They passed without contacting external services.
