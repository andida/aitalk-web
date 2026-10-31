# D1 and authentication type review (2026-10-31)

The D1 adapter imports `D1Database` as a type from the already declared
`@cloudflare/workers-types` package's module source, rather than a handwritten
interface containing four explicit `any` members. The import is type-only and
does not install Workers globals. With comments excluded, the emitted runtime
JavaScript is identical to the pre-change file. `getD1Binding()` still throws:
this change neither connects D1 nor establishes transaction guarantees.

The auth configuration now uses the existing email service config type, a
specific social-provider configuration type, an unknown hook context and the
email address shape required by its email callback. Its emitted JavaScript is
identical to the pre-change version. No login, mail or database call was made.

An attempted more precise type for the user-create `before` callback exposed
an existing mismatch: the installed Better Auth 1.3.9 declaration expects
`void`, `false`, or an object containing `data`, but the current callback
returns the user itself. The attempt was reverted rather than masking this with
a double assertion. The installed runtime invokes the callback with the
`actualData` object and merges returned data only when a `data` property is
present; the current callback also mutates that object. This observation does
not establish correct behavior across all auth paths. Resolve the callback
contract with dedicated auth tests before treating authentication as verified.

The credit-grant function's user parameter was widened to the ID and email it
actually reads, and the initial-role function's user parameter to the ID and
creation time it actually reads. This allows the auth `after` callback to use
the corresponding concrete shape without claiming that the Better Auth user
contains every application-specific field. The emitted JavaScript of all three
modules remained identical; no real credit or role was granted.

The isolated candidate passed the full TypeScript check; targeted D1 lint
passed. Workspace `test:aitalk` passed 81/81 and `git diff --check` passed.
Full workspace lint reported 75 errors and 199 warnings. An isolated OpenNext
build passed after the D1 and first auth changes; the subsequent type-only
credit/role/auth adjustments were type-checked and compared for identical
emitted runtime JavaScript, but not rebuilt separately.

## Follow-up: user-create callback contract

The callback was subsequently updated to return `{ data: user }`, the contract
expected by the installed Better Auth 1.3.9 hook pipeline. IP, locale and UTM
enrichment were extracted into `src/core/auth/user-create-hook.ts`, preserving
the existing in-place and best-effort behavior. Six regression tests were
added to `test:aitalk`: locale/cookie precedence and sanitization; existing
attribution; malformed input and IP failures; input length limits; the actual Better Auth hook
pipeline with a fake adapter; and an actual Better Auth email-signup flow with
its in-memory adapter. The last test is an isolated local flow, not an actual
database, email, social-login or production test. No external account or data
was used. An isolated Git worktree and dependency-complete candidate received
byte-identical source; candidate TypeScript passed. After application, the
workspace test suite passed 87/87, `git diff --check` passed, and lint reported
74 errors and 199 warnings. The source SHA-256 is
`e53fc51b8e49c95b49bac35da1a44f36ad01367980038fee0865f82d24b6fc72` and the
test SHA-256 is
`edb4159ece6b4e9119f50866cbce44467a8ef6f875e5181651ccedba125951ac`.
An isolated OpenNext build passed for the corrected production sources; the
additional length-limit test was added after that build and separately run.
