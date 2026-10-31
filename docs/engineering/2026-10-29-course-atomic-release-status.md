# Course backup, restore and atomic completion — 2026-10-29

## Latest verification update (supersedes earlier pending states below)

Further lint work: the isolated compatible-dependency checkout now reports 376
quiet ESLint errors across 125 files, down from 418. Changes include typed shared
user association, typed icon props, MDX component naming, and narrowed catch
handling in chat/AI endpoints. TypeScript and all 48 AITalk tests pass; scoped
lint passes for the changed API/user/MDX files, but smart-icon retains one React
immutability error. A clean Worker build gate passed on an earlier snapshot of
this batch, before the final five chat/AI catch edits, and still emitted Edge
warnings. OAuth, clipboard, chat error paths and physical-device E2E remain
unverified. The previously recorded credential incident remains unresolved.
Two MDX link regression tests have since been added to the existing AITalk test
script; all 50 tests now pass in the isolated checkout. They verify static markup
only and are not browser or authentication E2E.
Subsequent speech endpoint exception narrowing and form/table prop immutability
repairs bring the current isolated quiet lint count to 369 errors in 120 files.
The applicable scoped speech ESLint checks and TypeScript passed. Live voice,
form and table behavior are not covered by these static checks.
Further form schema typing and a narrowly scoped declaration for OverType 1.2.6
reduced the count to 366 in 119 files. The package's exports map does not expose
its own typings; the legacy `showToolbar` option is not implemented by that
upstream version and remains unverified, not claimed as fixed. The modified
editor was not browser-tested. Fifty existing/new automated tests and TypeScript
passed in the isolated checkout; no lint rule was disabled.
Additional React component and JSON preview fixes reduce the current quiet lint
count to 361 errors across 117 files. The test script now has 53 passing tests,
including three static JSON preview cases. The particles animation, editor and
form/table interactions have not been verified in a real browser.
The copyright component now uses a server-stable external-store snapshot in place
of a synchronous state-setting effect. Its static SSR test raises the script total
to 54 passing tests; client hydration is still unverified. A fresh isolated Worker
build passed on a snapshot taken before the latest JSON preview/copyright edits,
with the previously recorded Edge warning; no deployment was performed.
Latest isolated quiet ESLint recount: 358 errors across 116 files. The test
script passes 54 tests; the additional copyright check covers server rendering,
not client hydration. External React review connection briefly interrupted and
was reopened at its saved URL; its final patch is still awaiting verification.
After the shared hydration-hook changes and deterministic sidebar skeleton, the
current quiet lint count is 353 errors and 56 automated tests pass. A separate
fresh local Worker build of an earlier snapshot containing the hydration hook
passed with the known Edge warning. In Chrome, the landing-page language menu
switched English to Chinese on desktop and Chinese to English at 390x844; the
landing and login pages had no horizontal overflow at that mobile viewport.
This was localhost browser emulation, without production credentials. Theme and
notification interactions, physical devices and current sidebar changes remain
unverified by that browser test.
The relevant new components pass targeted ESLint and TypeScript. The local Worker
browser checks were against a snapshot created before the sidebar-skeleton change.
`src/app/[locale]/(landing)/[...slug]/page.tsx` also has its dynamic-page JSX moved
outside its lookup try/catch; type checking and scoped ESLint passed, but dynamic
page navigation was not checked in a browser.
The database reviewer reports D1's existing direct-callback fallback is not
transactional and reports lost-update/partial-write reproductions. Local source
inspection supports the lack of a transaction; those external reproductions have
not yet been independently rerun. Local Wrangler configuration specifies
PostgreSQL, but effective production bindings have not been reconfirmed. Do not
assume this makes D1 safe or that production uses a particular provider.
The database adapter's cross-dialect lint/transaction review was separately
requested at https://chatgpt.com/c/6ae3fca9-247c-83ec-893f-bf9c391ef0f1.
The selected, pattern-scanned source ZIP is 43897 bytes, SHA-256
`4a4b0dd277213ac20ee7b78bb7ee26f8853357e7dee1f2d1b382b22a57c6c141`.
Configuration defaults that triggered the credential-pattern scan were omitted;
the reviewer has not received credentials or real user data. Its conclusions
remain pending and are not accepted without independent verification.

Lint remediation follow-up: in the compatible-dependency isolated checkout, the
baseline 418 errors declined to 393 after targeted API declaration/error handling,
theme import naming, common type aliases, and social sign-in callback changes.
The 48 AITalk tests and TypeScript passed; the modified social-provider file and
first five changed files passed scoped ESLint. Real OAuth popup/redirect behavior
has not been tested. All counts are quiet ESLint errors, not warning counts.
An independent Pro assessment of the high-risk practice-client React state changes
is in progress at https://chatgpt.com/c/6ae3fae9-f920-83ec-a404-9371d0395c6b.
Its scanned source ZIP is 34737 bytes, SHA-256
`66cd2e0bba623c7d25b6f6f4b1bb3d85ede1454846bee114afc5978e1ffa3341`,
based on Web commit 3bcef9af9a83016e756a7a4b08c8c0ee43e0300b plus local changes.
No credentials, environment files, user data or build output were included.

Compatibility follow-up: after the user confirmed the concurrent dependency work,
targeted changes preserve its Next 16.4.3, OpenNext 1.20.14, Wrangler 4.156.0 and
Workers types versions while upgrading Fumadocs core/UI to 16.17.9, MDX to
15.4.10, Tailwind to 4.3.3 and Zod to a compatible 4.x version. The unsupported
React clipboard wrapper was replaced with `copy-to-clipboard` and a native button;
the docs provider, TOC imports and generated MDX source path were adapted. The
resulting package and lock were resolved and tested in isolation; the working
checkout's final lock matches that tested candidate SHA-256
`b678074386e59e4d9e914d9f70f573d2147f5bd9c05605b2fb361e4cf82202f2`.
The local checkout's existing node_modules was intentionally not overwritten and
therefore is stale; use a clean frozen install before testing there. The candidate
passed 48 tests, type checking, scoped lint (one existing image warning), a real
fresh-output build gate, and a second clean frozen install. A local Worker rendered
English and Chinese docs and opened the search dialog. The docs contain existing
`YourAppName` template text and search results were not validated. Clipboard and
authenticated app E2E remain unverified. The successful build still emits Edge
runtime warnings. Do not treat these checks as a production release approval.
In this candidate `pnpm exec eslint . --quiet` still fails with 418 errors; this
is not a full lint pass and does not report warning counts. It includes substantial
existing template and administrative code, so blanket rule suppression or unsafe
mechanical `any` replacements would not constitute a safe repair.

The user confirmed the dependency changes came from parallel work and asked us to
preserve them. A separate snapshot (no production environment files or Git data)
was made for validation. Its package.json SHA-256 is
`5421a35a78ee3f2f454224ea547f362dab9f48838f1d5b5ff9bde45525fdd835`, and lockfile
SHA-256 is `d36f7d3a211d1ff8b876d157ae677e36337c1c6a489c3ac2890b29ffd4da425c`;
it differs from the prior isolated candidate. A frozen-lockfile, strict-peer
installation completed, including postinstall, using registry access. This alone
does not establish runtime or application compatibility.

Direct inspection of the installed package manifests found that fumadocs-core and
fumadocs-ui 15.7.12 declare Next 14/15 only, fumadocs-mdx 11.10.0 declares Next
15.3, and react-copy-to-clipboard 5.1.0 declares React through 18; the snapshot
uses Next 16.4.3 and React 19.2.1. A successful frozen strict-peer install did not
surface these incompatible peer declarations. They remain release blockers; do not
interpret that install or the successful build as a supported peer combination.

The snapshot's `pnpm run build` completed and generated a Worker with Next 16.4.3
and OpenNext 1.20.14; its type check and 48 course/UI/membership tests passed.
Warnings include Supabase's Node `process.version` use in middleware/Edge and
deprecated middleware. These require runtime assessment; this is not an E2E pass.
The Pro build-gate correction ZIP is preserved as
`2026-10-30-pro-build-gate-correction.zip` (13181 bytes, SHA-256
`3f5d5ded030ad9effb71acb9e038041a104868563d23e49638179ee17df7959c`);
all included SHA256SUMS entries matched. In an isolated snapshot, the prior gate
script and its incremental correction applied cleanly and 65 independent runs
of its simulated builder tests passed. Those are gate tests, not real app tests.
In a separate clean directory with a fresh local install, the corrected gate ran
the real Next/OpenNext production build and passed its fresh-output and log checks;
warnings and all broader application release blockers remain. An earlier experiment
with node_modules symlinked outside its tracing root failed on native sharp bundling;
that was not counted as a successful build. The two gate scripts were added to
the working checkout after review; they are not wired into the deployment pipeline.
After repository formatting, both scripts passed scoped ESLint and Prettier, and
their 65 simulated-builder tests passed again in the working checkout.

Workspace discrepancy: on reinspection the current working `package.json` and
lockfile already contain dependency changes, including Next 16.4.3 and OpenNext
1.20.14, contrary to the earlier assessment that upgrades were isolated only.
Their provenance and relation to the independently tested candidate are not yet
established. Preserve the existing files; do not overwrite or assume that the
clean isolated candidate and current checkout are equivalent. The current
`cf:check` also fails four credential/authentication availability checks; it does
not verify production functionality or authorize deployment.

2026-10-30 follow-up: the latest full `pnpm run lint` fails with 419 errors and
238 warnings in the current checkout. `test:aitalk` was changed to use the Node
tsx loader directly, avoiding the sandbox IPC failure; the actual package script
now passes all 48 tests. TypeScript and the scoped lint check also passed (the
latter with five warnings). The separate clean upgrade candidate completed a fresh
frozen-lockfile strict-peer installation, TypeScript check, and Worker build without
the reproduced `Failed to copy` errors; 39 course and 2 UI tests passed in that
isolated candidate. Its lock SHA-256 is
`a831208c59432b55d7db9a5e223cca9a9639df91c976ad14488a01f2128db3c0`.
Build warnings remain and the upgrade has not been integrated into the working
checkout or verified with authenticated application E2E. This is not a production
release pass. The current working checkout's 48 tests passed via `node --import tsx
--test` (the `tsx` CLI itself encountered a sandbox IPC permission error). Scoped
lint on the latest touched files passed with five existing warnings. Flutter
`analyze --no-pub` reported 0 errors, 125 warnings and 293 informational findings;
there are no native-App integration tests or physical-device acceptance evidence.

The Cloudflare dashboard showed active production version short ID `a90db663` at
100%, with previous code version `22886945` associated with Web commit
`3bcef9af9a83016e756a7a4b08c8c0ee43e0300b`. These are displayed short IDs, not
proof of a tested rollback. Worker build-time public origin, bindings, secret
preservation and callback behavior still require validation before deployment.

2026-10-30: the user authorized Andy's account for course-completion testing and
retention of its test progress. No course completion has yet been submitted.
The other Chrome profile had the authorized Supabase project open. Its URL settings
show Site URL https://aitalk.im and allow the domain's /auth/callback (also www).
The local Wrangler public app URL was changed to https://aitalk.im; deploy and
end-to-end authentication checks are still outstanding.

Security incident: the authorized Supabase browser window was already showing a
legacy service_role key when its accessibility state was read. The key appeared
in tool output; do not reproduce, upload, or store the value elsewhere. Treat the
credential as exposed and plan its retirement. Supabase documents that legacy anon,
service_role and JWT signing are coupled; indiscriminate revocation can interrupt
mobile clients and sessions. Inventory all consumers, prepare and test a migration to
publishable/secret API keys and an appropriate signing-key transition before any
legacy-key revocation; secret entry and credential changes require owner handoff.
No key or signing setting was changed. References:
https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
https://supabase.com/docs/guides/auth/signing-keys
See `2026-10-30-supabase-key-incident.md` for the non-secret consumer inventory and
staged mitigation; this credential issue remains a production security blocker.

Further work on 2026-10-29: the existing production Worker settings were inspected
read-only. The Git-connected Worker is `aitalk-web-lp`; its `WORKER_SELF_REFERENCE`
currently points to the different `aitalk-web` Worker, and its public app URL is
the workers.dev address. The dashboard explicitly recommends setting the config name
to `aitalk-web-lp`. Local `wrangler.jsonc` now names the production Worker and
points the self-reference to itself. The readiness script checks both values and
fails on a noncanonical public URL; auth callbacks must be verified before changing
the URL. Neither configuration change has been deployed. Scoped ESLint and Prettier
passed for the readiness script/config; readiness still fails due to unresolved URL
and credential/auth prerequisites. The script now checks for the server-only
Supabase service key without reading its value. A redundant second build was removed
from the alpha deployment script. Wrangler dry-run with explicit config exited 0,
but also emitted a log-file permission error and bundle warnings; it is not a
deployment or a clean production validation. Keep dashboard secrets intact.

Local React Hook ordering fixes in locale detection, payment-provider rendering and
the time component were type-checked. Full ESLint in the original workspace is now
422 errors and 236 warnings, down from 438/236; it remains a failed gate. The locale
detector also has a separate pre-existing set-state-in-effect error now visible after
fixing its conditional-hook errors. No lint rules were disabled.

Upgrade experiments only in the detached checkout: Next 16.3.8 / OpenNext 1.20.10
and Next 16.4.3 / OpenNext 1.20.12 produced Workers without the earlier Failed to
copy messages. The latter build still reported Supabase middleware Edge-runtime,
deprecated middleware and duplicate PayPal case warnings. Its isolated 39 course
tests and 2 UI tests and TypeScript check passed; full lint failed with 482 errors,
239 warnings on that different checkout. Next 16.3.8 is affected by later published
security advisories; it is not a release candidate. The tested upgrade has not been
applied to the original workspace: multiple peer dependencies remain unsupported,
and a newer OpenNext version and independent Pro review are still being assessed.
The full lockfile changed substantially and requires review rather than blind copying.
Further isolation tests with Next 16.4.3, OpenNext 1.20.14, Wrangler 4.148.0,
Fumadocs 16/MDX 15, next-intl 4.14.9 and Tailwind 4.3.3 required four source/config
adaptations and produced a Worker successfully, with CSS, middleware and bundle
warnings. The resulting local Worker served English and Chinese docs; its search
dialog opened, but the existing search API returns an empty array. `next start` on
the standalone output looped for default-locale paths and is not supported by the
project's Next configuration; the corresponding Worker endpoint rendered normally.
This candidate is still isolated and not release-approved. Full app, login, shared
state and production tests, remaining peer conflicts and lockfile review remain.

Original-workspace lint was subsequently reduced to 392 errors and 235 warnings;
the gate still fails. Two new route safety
tests and two cookie-header tests pass and are included in `test:aitalk`. The latest
original-workspace course/UI/membership and newly added tests total 48 passing.

At 390x844 in Chrome viewport emulation, the mobile free-conversation text-input
toggle, sending a user-authorized labeled test message and the live Tutor response
were verified. Input returned after the response and there was no horizontal
overflow. Screenshot: assets/2026-10-29-live-mobile-free-reply.png. This tests the
existing Web deployment, not physical-device/native App or the pending save fix.

Separate external build/deployment review conversation:
https://chatgpt.com/c/6ae34203-ae84-83ec-8994-b6a4ab65cc01
Input ZIP `build-release-review-20261029.zip`: six build configuration/lock files,
150235 bytes, SHA-256 `c15b2c8779c6b0fe34f2ca01e771d5c79418a6459cffc3b5dcfced502bf81289`,
from Web commit 3bcef9af9a83016e756a7a4b08c8c0ee43e0300b. No environment files,
credentials, user data, Git metadata or dependencies were included; pattern scan
of the selected source files found no key material. See the delivered review and
subsequent correction request below.

The build review was delivered and retained as `2026-10-30-pro-build-review.zip`
(21700 bytes, SHA-256 `05f7865ce13abd73f4a9c3315647d303cda8a316d5912af937ce2c867591853d`).
All contained SHA256SUMS entries matched; the proposed patch is 8021 bytes with
SHA-256 `1c91220eb4cbb5ccfb2fa50975d1b215df87cbbbfd50e07820578fe6ddab6304`.
It applies dry-run to the original six-file source package. Pro's 12 checks were
simulations, not application tests. Independent review identified that its build
gate forwards skip-build arguments and accepts existing nonempty artifacts without
proving this run generated them. A correction and executable regression tests were
requested in the same conversation; the patch is not accepted or applied.

The candidate upgrade later removed its peer conflicts in isolation by updating
Fumadocs, next-intl, Tailwind, Zod and Workers types and replacing the unsupported
React clipboard wrapper. A separate clean directory with no old dependencies,
outputs or environment files passed `pnpm install --frozen-lockfile
--strict-peer-dependencies`; the lock SHA matched the candidate exactly. A clean
build and broader behavior verification are still required before adoption.

2026-10-29 17:22 Asia/Shanghai: migration-history compatibility prerequisite
APPLIED through MCP as 20261029092218_course_migration_history_compatibility.
Before-state was an empty table containing only version text NOT NULL (0 rows).
Official CLI CreateMigrationTable adds nullable statements text[] and name text;
the identical additive operations were tested twice in an isolated transaction,
preserved a synthetic version, and rolled back locally. Production apply returned
success; list_migrations now works and reports the exact applied version/name.
The local migration filename matches that generated version. No course content or
learner rows changed. The atomic completion RPC remains absent and un-deployed.
This supersedes earlier statements that no production DDL had occurred.
Source: https://github.com/supabase/cli/blob/pkg/v1.2.3/pkg/migration/history.go

- Production dashboard now lists SUPABASE_SERVICE_ROLE_KEY as encrypted. Its
  value was never read; runtime authentication remains untested.
- Pro's full patch and report were downloaded, hash-verified, and independently
  checked in two detached worktrees. Its invalid nullable fixture was rejected.
- Pro supplied a 2,645-byte correction, SHA-256
  `96f4bf8b57c1a174c1b411fbce2f62f29d4524f9d621b04549710b27fe56f366`.
  The correction was verified and incorporated alongside extra INSERT rejection
  checks: schema NOT NULL metadata, failed INSERTs and UPDATEs leave no changes,
  and a subsequent valid completion succeeds. No constraints were weakened.
- All 29 actual PostgreSQL checks now pass in isolated database
  `course_atomic_test_1793263832119`, including the two deterministic lock
  schedules, canonical-report protection and four-stage failure rollback.
- Isolated TypeScript passed after MDX generation; 41 isolated unit/UI tests
  passed. The accepted source changes were then applied to the original workspaces
  without overwriting unrelated changes; 44 tests passed there (including the
  three pre-existing uncommitted membership tests).
- Isolated production build passed after rerunning with network access for Google
  Fonts. Worker generated; existing PayPal duplicate-case and middleware warnings
  remain. This run did not reproduce the earlier package-copy errors.
- Checked App source uses separate Supabase requests for Start/completion/plan
  writes, not an opposing multi-table transaction. This is source evidence, not
  an executed mobile App acceptance test.
- Production active-plan level aggregate contains supported numeric 1–5 strings.
- Latest original-workspace checks: 44 tests passed; TypeScript and scoped ESLint
  passed after removing 16 any-type errors in the changed course files and safely
  narrowing saved-word JSON rendering. Full ESLint still fails: 438 errors and
  236 warnings. No global rule suppression was introduced.
- The final original-workspace production build exited 0 and generated a Worker,
  but reproduced OpenNext 1.19.11 package-copy ERROR messages. Therefore it is not
  accepted as a clean release build despite its exit code and isolated build result.
- In an isolated checkout, installing OpenNext Cloudflare 1.20.10 (the version
  reported to fix string exports) revealed incompatible peer requirements:
  Next >=15.5.27 <16 or >=16.3.8 and Wrangler ^4.148.0, while this project uses
  Next 16.2.9 and Wrangler 4.99.0. The experimental install was not copied to the
  original workspace or adopted; no supported upgrade/build has been established.
- Live desktop course list and completed-lesson review were inspected. Chrome
  mobile emulation at 390x844 showed no horizontal overflow on lessons, review,
  and the eight-topic free-conversation selector. Daily-life selection opened the
  expected Level 1 greeting. Screenshots are in assets/2026-10-29-live-*.png.
  These checks cover the existing deployment, not the un-deployed atomic fix;
  emulation is not physical-device or native-App acceptance.
- No test message or course completion was submitted to the logged-in live learner
  account. Live test-write authorization/test-account selection remains pending.
  A later mobile input-mode click timed out, so that interaction is not passed.
- Subsequent user authorization permitted free-conversation testing only on the
  Andy account. Two explicitly marked product-test messages were sent through the
  live desktop Daily life free conversation. Both received coherent Level 1 replies
  with follow-up questions and Chinese hints, and the input was re-enabled after
  each reply. Screenshot: assets/2026-10-29-live-free-conversation-desktop.png.
  This supersedes the earlier no-test-message statement; no course completion was
  submitted. The mobile input interaction and dedicated-account course-save E2E
  remain unverified. This tested the existing deployment, not the pending patch.
- Still NOT release-approved: full lint, clean build, authenticated end-to-end
  saving and deployed service-role RPC remain incomplete. Migration history is
  repaired, but the atomic RPC migration is not applied. No code deployment,
  commits or pushes were performed. User's secret-setting operation is separate.

Pro artifacts and correction screenshot are retained in this engineering folder.

## Current release decision

NOT RELEASE-APPROVED. Only the migration-history compatibility DDL described above
was applied to production. No course completion or content import, Git commit/push,
or code deployment was performed. Two authorized free-conversation test messages
were sent afterward and may produce normal service records. Existing unrelated
workspace changes were preserved.
Web baseline: `3bcef9af9a83016e756a7a4b08c8c0ee43e0300b` (main).
Edge baseline: `44b82c50ed12bcd4291e029eef6ca854d61a1eec`.

## Verified backup and actual restore

MCP was authenticated to `jkdhpfscpoahowolprco`. The initial whole-course JSON
request failed with HTTP 524 and subsequent connection timeouts. It produced no
usable backup. A later bounded health query succeeded and confirmed no matching
snapshot query remained active. Export was changed to 100-row bounded queries
with 10-second statement timeouts; no more large aggregate exports were attempted.

Private backup directory (outside source repositories):
`/Users/andida/Documents/javastudy/aitalk/.private-backups/course-mcp-20261029/`
Directory mode is 0700. Do not commit, upload to ChatGPT, or include it in source ZIPs.

Archive: `backup.tar.gz`, 122,909 bytes.
SHA-256: `db8655bc8374cb1e3012a6e1125969ccc2a1452d05e6c169f2d74c3e5a48fede`.

Scope: all 1,000 lesson parent rows; 500 English steps (plus any attempt-referenced
steps); 100 English-lesson Chinese translations; 500 Chinese step translations;
38 learning plans, 760 plan items, 47 progress records, and 4 attempts. Total 2,949
rows. Catalog metadata includes columns, defaults/identity, constraints, indexes,
table ACLs, RLS policies, sequence last values, and the auth.uid function. No
custom triggers existed on the scoped tables at capture time.

Before/after per-table content fingerprints and counts matched. This is a scoped
logical backup with optimistic consistency checks, NOT an MVCC whole-project
snapshot or Supabase disaster-recovery backup. Auth accounts, other-language step
data/translations, Storage objects, provider settings, secrets and Edge deployments
are outside scope. Sequence last values were restored with is_called=true; exact
sequence call-state was not captured. Do not restore stale learner snapshots over
production as a release rollback: that would lose subsequent legitimate learning.

Actual restore ran on PostgreSQL 15.19, same major as production 15.1, in a separate
local database. All eight restored row counts/fingerprints matched. Constraints,
indexes, table grants and RLS policies were recreated successfully. The private
test instance accepted only a private Unix socket, with TCP disabled. No hosted
Auth/REST runtime was simulated as real Supabase acceptance.

See [machine-readable restore evidence](2026-10-29-course-restore-evidence.json).
The local Homebrew installation failed on dependency download paths. The official
cached PostgreSQL bottle was extracted privately and relocated to existing local
dependencies, with a runtime path symlink at `/opt/homebrew/opt/postgresql@15`.
No system boot service was enabled. Scripts assume this local test runtime.

## Courses are already imported

Live inventory: English L1 has 20 `v2_pilot` lessons; English L2–L5 have 80
`v2_full` lessons. In a cloned restored database, running the existing local
202607020001 import twice changed no semantic content in any scoped table when
created_at/updated_at were excluded. The 80 lessons each have five distinct steps.
Therefore reimporting this same file is unnecessary and would only rewrite
timestamps/advance sequences. No production import was executed.

This checks structural completeness and content equivalence, not pedagogical
quality. The existing template-heavy lesson language still needs content review.

## Local progress fix

- New `complete_course_lesson_v1` is SECURITY INVOKER and EXECUTE is granted only
  to service_role. It validates payload and owned plan membership, serializes by
  learner, and saves the report/progress/plan in one transaction.
- Retries return the committed canonical report without another attempt. The
  plan advances only within the same level and only if it still points at that
  lesson (or has no current lesson). Old retries cannot regress a newer pointer.
- The completion trigger protects completed progress against stale Start upserts
  from older App/Web clients. No existing App table grants were revoked.
- The server-only Web helper derives user ID from getUser and uses a runtime-only
  service credential. No exported server action accepts a client report/score.
  Missing configuration fails closed; it does not fall back to partial writes.
- This is not a complete redesign of direct App writes or transcript provenance.
  Ordinary App clients retain their existing RLS-authorized row mutations.

## Independent checks

| Check | Result |
| --- | --- |
| Actual local PostgreSQL restore | Passed: 8 tables, 2,949 rows, exact row fingerprints |
| Existing course import applied twice in isolated clone | Passed: no semantic changes, 80 × 5 steps |
| PostgreSQL integration tests | 13 checks passed |
| Concurrent completion | 10 independent transactions, one attempt |
| Injected report/progress/item/plan failures | All roll back; retries succeed |
| Cross-user plan, anon/authenticated RPC, invalid grades | Rejected before writes |
| Retry/legacy partial/last lesson/stale Start | Passed in isolated DB |
| Unit/UI/contract tests | 41/41 passed via node --import tsx --test |
| TypeScript | Passed |
| Scoped ESLint / Prettier / diff whitespace | Passed |
| Full lint | Failed: 454 errors, 236 warnings (pre-existing count unchanged) |
| Production build | Exit 0, Worker generated; NOT clean: dependency copy errors and warnings remain |
| Authenticated end-to-end tutor save, mobile/desktop | Not performed for this new patch |

The first integration runner failed because it double-encoded JSON parameters;
using the driver's JSON helper fixed the test harness. The first pnpm test command
was blocked by sandbox IPC permissions; the equivalent node test entry point ran
successfully. Neither failed attempt was counted as a pass.

Live aggregate diagnostic: 7 completed progress rows, 0 matching plan items still
incomplete. This does not prove all plan states correct; no real learner rows were
modified for testing or repair.

## External review and deployment prerequisites

Prepared minimal credential-scanned source package:
`.source-packages/atomic-course-review-20261029.zip` (workspace root), 29,065 bytes,
13 explicit source files, SHA-256
`628a7f7786173966131d486de65b23559ec4c14c2779992c0d7d8e493be67a78`.
No .env, .git, dependencies, builds, database records or browser state included.
The package includes local uncommitted modifications on the above baselines.

Existing external review conversation:
https://chatgpt.com/c/6a697966-103c-83ec-987d-d129dd72791f
Reopening it in IAB showed a signed-out ChatGPT screen. The user then requested
external Chrome instead. External Chrome successfully restored the conversation
after one retry and showed model 5.6 Pro. The above scanned source ZIP and detailed
review brief were uploaded and submitted once; the page confirmed ChatGPT was
responding. External review is now pending; no new Pro patch has been accepted.
No database records or credentials were transmitted. Submission evidence:
[external Pro review](assets/2026-10-29-external-pro-review.png).

Follow-up at approximately 14:48 Asia/Shanghai: Pro is still processing and has
not delivered the downloadable correction. Its score-normalization finding was
independently reproduced against saveTutorCompletion: input -1 committed 0,
101 committed 100, and 2.5 committed 3. These inputs must be rejected before
buildPracticeReport normalization; SQL validation alone does not catch them.
Pro also flagged client-writable metadata being used to select a trusted retry
report; this remains pending independent reproduction and patch review.

The owner reported configuring the runtime credential, but the observed Cloudflare
submission subsequently returned the alert "请重试" and retained the form. The
agent did not read the value or resubmit it. The owner was asked to retry the
credential submission; persistence and runtime availability remain unverified.

Subsequent verification: the production dashboard now lists
SUPABASE_SERVICE_ROLE_KEY as an encrypted runtime secret. The value was not read.
This verifies configuration presence, not successful RPC authentication.

Pro delivered a 60,607-byte patch, SHA-256
`b7add86847cd8f1968baa184e64268875291ce3772c8de7c335d51c2bddbc7f4`, and a
17,816-byte report, SHA-256
`3ab91b70d7fcf3dbecea4fa93e8cee856f749061e31d906c0a7366e29b2d7a1e`.
Both downloaded hashes matched. Copies are retained alongside this report as
2026-10-29-pro-atomic-completion.patch and 2026-10-29-pro-atomic-completion-report.md.
The patch was applied only in detached worktrees under
`/private/tmp/aitalk-pro-verify-rsr328`, over the exact uploaded source baseline.
The original source workspaces have not received the Pro patch.

Independent Pro-patch checks: 41 unit/UI tests passed (this isolated baseline
does not include the unrelated uncommitted membership tests); tsc passed after
generating the expected MDX types. Four files needed Prettier formatting, applied
only in the isolated worktree. Scoped lint still reports 16 existing any-type
errors in actions/data/types; it is not a lint pass. Actual PostgreSQL integration
failed at script line 642 with SQLSTATE 23502 because its nullable legacy fixture
violates the restored production NOT NULL status constraint. The failure was sent
to Pro with a request for a minimal correction that tests real constraints and
does not weaken them. The 29-check integration suite is NOT marked passed.

Cloudflare dashboard is accessible. Actual production Worker is `aitalk-web-lp`
and its runtime variable list has no SUPABASE_SERVICE_ROLE_KEY. A blank encrypted
secret form is prepared for the owner, but nothing was submitted. Credential
entry/submission is a user handoff; never send the key through chat. The locally
configured worker name and self-service binding still point to `aitalk-web`, while
the Git-connected production Worker is `aitalk-web-lp`; reconcile deliberately
before any direct CLI deployment. Wrangler's local OAuth refresh failed (400),
so direct CLI configuration is not authenticated.

Do not deploy the new server action before the service secret and tested SQL RPC
exist, or all guided saves will fail closed. Do not apply production migrations
before independent review and the remaining release gates. Migration history is
nonstandard: schema_migrations currently has only a version column and no rows;
MCP list_migrations fails because it expects name. Inspect the apply tool's behavior
without assuming it can record migrations in this schema. Do not silently change
history schema or use an untracked DDL workaround.

Rollback design (not executed): revert the Web code first if necessary; remove only
the newly added trigger/function definitions after confirming no consumers depend
on them. Retain legitimately committed attempts/progress. Never restore the whole
backup over live learner data as an automatic rollback.

Other pre-existing Supabase advisories require separate handling: mutable function
search paths ([guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)),
RLS enabled with no policy on several legacy tables ([guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)),
and outstanding PostgreSQL security patches ([upgrade guidance](https://supabase.com/docs/guides/platform/upgrading)).
No blanket grants or database upgrade were performed.

Additional read-only production catalog verification: service_role already has
USAGE and SELECT on lesson_attempts_id_seq, user_lesson_progress_id_seq,
user_learning_plan_items_id_seq and user_learning_plans_id_seq. The local
integration runner's sequence grants therefore match these required production
privileges; they are not a proposal to widen production access. No production
grants were changed.

## Build-message investigation while external review runs

The installed OpenNext Cloudflare 1.19.11 `transformPackageJson` was called locally
with the installed unified package manifest. It reproducibly throws
`Cannot use 'in' operator to search for 'workerd' in ./index.js` because exports is
a string, although the package file exists. The adapter catches this TypeError
and labels it `Failed to copy`. This is the same upstream
[issue #1299](https://github.com/opennextjs/opennextjs-cloudflare/issues/1299), with
the official release notes documenting the string-exports fix in 1.20.10
([releases](https://github.com/opennextjs/opennextjs-cloudflare/releases)).
This explains the reproduced message, but is not proof that every copy error or
every runtime route is harmless. No dependency/lockfile update or node_modules
source patch was applied. Client static bundle search found no occurrence of
SUPABASE_SERVICE_ROLE_KEY; no actual service credential was present for testing.

## Lint cleanup and external review, 2026-10-30

Payment lint review in progress:
https://chatgpt.com/c/6ae49a63-18ac-83ec-8924-4f474a25fe00
Input `aitalk-payment-lint-review-20261030.zip`: 201,751 bytes, SHA-256
`5a5dc97e3ffa40ae5af2cc5ca153a52951d36c97be3f17f44fd57f35c0fa7196`,
commit `3bcef9af9a83016e756a7a4b08c8c0ee43e0300b` plus local modifications.
Files were selected explicitly and credential-pattern scanned; no env files,
credentials, database contents or browser state were included. Review results
require independent verification before integration.

The latest full ESLint run reported 224 errors in 87 files, down from 418;
media-hook changes were also checked with scoped lint. A mocked React/jsdom
check passed SSR defaults, client viewport changes,
query changes and listener cleanup; real-browser resize is not yet verified.
The repository's test:aitalk suite passes 63 tests, TypeScript passes, and an
isolated OpenNext build including the showcase type cleanup succeeds; later
authentication and media-result edits require a fresh build. These results do
not constitute production or real-device verification. An
isolated OpenNext production build including billing/invoice and error-boundary
edits completed successfully, with webpack/CSS and deprecated middleware
warnings; it predates the subsequent SQL condition and leaderboard type cleanup.
Those changes passed scoped lint and TypeScript but their database paths have not
been separately exercised.
Payment edits have not been verified against real payment providers. The remaining
lint errors and credential incident still block release.

React review: https://chatgpt.com/c/6ae3fae9-f920-83ec-a404-9371d0395c6b
Input archive: 34,737 bytes; SHA-256
`66cd2e0bba623c7d25b6f6f4b1bb3d85ede1454846bee114afc5978e1ffa3341`;
source commit `3bcef9af9a83016e756a7a4b08c8c0ee43e0300b`, with existing
working-tree changes. External delivery retained as
`2026-10-30-pro-practice-lint-review.zip`, 113,880 bytes; SHA-256
`719b8051a07adad826cc66c4243b1b732be9c012a73fbd66c2f1827b50b52c6f`.
All 41 entries of the included SHA-256 manifest matched. Its initial patch was
tested in an isolated worktree: 39 mocked
React/jsdom tests, TypeScript and scoped lint passed. Node 22 was used despite
the harness declaring Node >=24. Its 32 attachment contract tests also passed
against the supplied source, not the detached worktree (which lacks one test file).
An additional independent test failed: when
planId changes from 501 to 502 with the same lesson/user/mode, a pending opening
response for plan 501 appears in the new plan. This evidence was sent back for
correction; client cancellation cannot undo an already accepted server action.
The external reviewer supplied a proposed correction with a plan-specific
storage key. The retained archive `2026-10-30-pro-plan-scope-fix.zip` is 151,903
bytes, SHA-256 `a79bc4a907c24669516def5e2529317df1642f53552bc749bf5c65ebc1d9d6b7`;
all included SHA256SUMS entries matched. Applied atop the previous patch in the
isolated worktree, the component SHA-256 matched the reported
`270b8dc6fa7400815de9db1176c08b15d7e6a4d68f7222662cdbaa06aaacbbb6`.
On Node 22, 26 new plan tests, 39 existing component tests and our separate
previously failing plan-change test passed using the mocked React/jsdom harness.
These do not verify real browser media or server-side persistence. The proposal
leaves old untagged guided history stored in the browser without displaying it;
we requested a safe read-only legacy-history entry.
The new legacy review package `2026-10-30-pro-legacy-history-fix.zip` is 172,923
bytes, SHA-256 `ba42f0c8aa7cc2841513a9a3fc6b381b9a61363375aac9a9897fb97fc03ae67a`;
its manifest verified. Applied to the isolated worktree its component hash was
`5e53596920077404fcc5f75035ddd4c9f949a70e6ed3eb1c593399bf069c77b8`.
On Node 22, 37 legacy, 26 plan and 39 component tests passed with mocked
React/jsdom, as did scoped lint and TypeScript. Applied to the current isolated
candidate, TypeScript, 58 tests and OpenNext build passed. A synthetic fixture
was also exercised in Chrome: desktop legacy disclosure and plan switch, plus
375x812 viewport, legacy text, text entry and mock send; viewport had no
horizontal overflow. The fixture uses mock tutor/auth boundaries; real media,
server persistence, physical devices and the full product page remain unverified.
The reviewed cumulative patch was subsequently applied to the local working tree.

Database review: https://chatgpt.com/c/6ae3fca9-247c-83ec-893f-bf9c391ef0f1
Input archive: 43,897 bytes; SHA-256
`4a4b0dd277213ac20ee7b78bb7ee26f8853357e7dee1f2d1b382b22a57c6c141`;
same commit and working-tree baseline. Retained external package
`2026-10-30-pro-db-lint-review.zip` is 197,656 bytes, SHA-256
`1c7933224406441920e0fc157357bf083f25459a18acff46238da4ba8b89cafd`;
its manifest verified. Its candidate patch was applied in the isolated worktree
and 54 proxy model tests passed against original and candidate on Node 22 and
TypeScript 5.9.2. The package's exact dependencies could not be installed on
macOS ARM because they include a Linux-only PostgreSQL binary. With the current
project dependencies and adapted isolated fixtures, six PostgreSQL 14.18 tests,
14 MySQL 8.0.27 scenarios, four SQL/mock checks and 12 local Miniflare D1
scenarios passed; temporary PostgreSQL and MySQL instances used private Unix
sockets and no production data. Miniflare confirmed the existing D1 callback
does not provide rollback. These tests use different database versions and
simplified tables, not the full business workflows or remote services. Scoped
lint retains one error for `db(): any`. Before subsequent showcase cleanup, a
combined isolated candidate with both external patches reported 294 lint errors
and passed TypeScript, 58 tests and OpenNext build, with existing warnings. Both reviewed patches were
subsequently applied to the local working tree; nothing was committed or deployed.

### Continued lint remediation (2026-10-30)

The isolated candidate's complete ESLint scan counted 179 errors in 59 files
after the latest completed scan (down from the earlier 418). TypeScript checking passed.
The actual `pnpm run lint` command on a fresh current-source snapshot exited 1
with 179 errors and 233 warnings; this is not a passing lint gate.
`git diff --check` returned zero at the latest local check.
The AITalk test command passed 77 tests, including three new authorization
wrapper tests for check ordering, denial and handler outcomes and a mocked
S3/R2 test for exact upload bytes from sliced buffers and a simulated carousel
navigation subscription test. A synthetic local component fixture was also
checked in Chrome at desktop and 375x812 viewport: next/previous button states
changed correctly and the second slide was visible. This is not a full product
page or physical-device test. Three tests cover chat input and metadata parsing;
malformed historical input is now rejected instead of automatically sent.
The real chat flow has not yet been retested. Activity-page parsing now ignores
malformed media results instead of crashing; tests use simulated provider data.
These tests do
not establish correctness of production authentication or database policies.
The separate `test:aitalk:ui` command also passed its two server-rendered
locale cases; those two cases are already included in the total above.
The current local checkout contains concurrent, uncommitted user changes and
has not been committed, pushed or deployed by this work.

A frozen isolated snapshot passed `pnpm run build` after its dependencies were
copied inside the snapshot and network access allowed font fetching. The build
reported existing middleware/Edge-runtime and CSS optimization warnings; it
does not prove the deployed Worker works. This snapshot predates the last two
config/RBAC annotation-only edits and subsequent carousel/chat/activity edits,
and must be rebuilt after final integration. In particular, webpack warned that
Supabase's `process.version` use is unsupported in the Edge runtime; the real
deployed middleware path has not been verified by this build.

Payment review is ongoing at https://chatgpt.com/c/6ae49a63-18ac-83ec-8924-4f474a25fe00.
The sanitized input archive `aitalk-payment-lint-review-20261030.zip` is 201,751
bytes with SHA-256 `5a5dc97e3ffa40ae5af2cc5ca153a52951d36c97be3f17f44fd57f35c0fa7196`;
it reflects commit `3bcef9af9a83016e756a7a4b08c8c0ee43e0300b` plus selected
uncommitted changes. The external review's payment patch has not been accepted.
Production readiness remains blocked by unresolved security and end-to-end
verification risks.

Payment delivery `2026-10-30-pro-payment-lint-tests.zip` is 395,828 bytes,
SHA-256 `3f7dedc44e50a35d18c8c9f3f44d4bad361841ebc3968e94d1f336297e4c1f46`.
Its internal manifest verified. The patch was applied to an isolated Git
worktree; an independent Node 22 run passed 188 named mocked tests, scoped
lint/type checks and the expected missing-source check. A full-source
candidate passed `tsc --noEmit`. None of this verifies real payment or database
behavior. Its separate full-source lint scan reported 126 errors; that is an
unmerged candidate, not the working-tree count; its existing 77-test AITalk
suite also passed. The patch has not been merged: its baseline security gaps and the
experimental Stripe interface were fed back for correction.
Independent source inspection confirms that checkout spreads client-supplied
metadata after server-generated `order_no` and `user_id` in
`src/app/api/payment/checkout/route.ts`, and PayPal's sandbox path continues
after an unsuccessful webhook signature result in
`src/extensions/payment/paypal.ts`. Exploitability and deployed configuration
have not been verified. Both require security review and regression tests before
any production release; a lint-only patch does not resolve them.
The pending external payment proposal mentions Stripe `rawRequest`. The
installed stripe-node 18.5.0 declarations explicitly mark that method as an
experimental, unstable interface; the official project documents it as a
custom request mechanism (https://github.com/stripe/stripe-node#custom-requests).
Its potential use must be reviewed against the existing typed SDK operations,
serialized payloads and retry behavior; it has not been accepted.

AI adapter review was separately requested at
https://chatgpt.com/c/6ae49dd0-fc10-83ec-a0fa-c8bfd3d8a396. Its selected-source
input `aitalk-ai-lint-review-20261030.zip` is 173,671 bytes, SHA-256
`b233b600f42f36a62b259e89f077a9dd450f30340b28b1d11b4cde9e009b29ea`;
its 15 explicitly selected files were scanned for common credential patterns
before upload. The external report states that malformed provider responses can
now throw before the query route reaches its existing failure/refund branch,
and remote generation may already have incurred provider cost. This proposed
patch has not been accepted; a correction covering confirmed failures,
ambiguous status, idempotency and recovery was requested. Its delivery package
`2026-10-30-pro-ai-lint-delivery.zip` is 105,176 bytes, SHA-256
`065d0f18d2f3f5a3752707a0cb4647eca65520d3ac477bb9abdd3430e082f0df`;
the internal manifest verified and its patch was applied to an isolated Git
worktree. Independent Node 22 verification passed scoped lint and strict type
checking, all 280 simulated contracts and a separate full-source typecheck.
That separate unmerged full-source candidate had 158 lint errors; this is not
the working-tree count. Its existing 77-test AITalk suite also passed.
Those simulations do not verify actual providers, storage, refunds or remote
costs; the failure/refund concern remains a blocker.

Dynamic-form review was separately requested at
https://chatgpt.com/c/6ae49e79-0b58-83ec-8e15-521f9ec5e4ef. Its selected-source
input `aitalk-form-lint-review-20261030.zip` is 187,861 bytes, SHA-256
`f80418bc5ea364e98f7baff4988730e30d9b1bc0a39a2750612b3bbff4dd921d`;
its 31 selected files were scanned for common credential patterns before
upload. The review is pending; no result has been accepted. Independent source
inspection confirms profile update and API-key deletion handlers currently
trust user/record values received via `passby` rather than reloading identity
and ownership inside the action. Exploitability has not been established;
this boundary needs server-side authorization tests before release. The admin
settings page checks permissions during page rendering, but its `handleSubmit`
currently checks only that a user exists, without repeating the permission
check inside the server action; that boundary also requires correction and
direct invocation tests. Next.js documents that Server Actions must be treated
as directly reachable and must independently check authorization:
https://nextjs.org/docs/app/guides/data-security#built-in-server-actions-security-features
Form delivery `2026-10-30-pro-form-lint-delivery.zip` is 136,595 bytes,
SHA-256 `46dedb9d98ab6a80b425bbdc6b3649cef2af2bd26041e1e35a896daadc1b8319`;
its manifest verified and its patch was applied in an isolated Git worktree.
An independent Node 22 run passed 50 component and 37 mocked action tests;
scoped lint had zero errors and 12 warnings, and scoped strict TypeScript
passed against the partial-source fixture. On the full worktree, the test
harness's separate typecheck also exposed incompatible duplicate `csstype`
versions; this environment limitation is not a full application result.
The complete current candidate failed TypeScript with eight errors in seven
omitted admin pages; concrete diagnostics and a 9,765-byte follow-up archive
with SHA-256 `9dfc58af336a212e0b4044c127fae330931af4f6d4a1ff91e9fbbaf67bfe52d8`
were sent for correction. At that point the form patch was not merged.
The subsequent `2026-10-31-pro-form-admin-fix.zip` is 143,599 bytes, SHA-256
`181a76cf0aa4473c74795f6f25c132e432c5a7ff86039af6dd502a065367ef5a`;
its internal manifest verified and its incremental patch was applied to the
isolated Git worktree, with all nine baseline and result hashes matching.
The independent partial-source harness passed 90 mocked admin contract tests,
the 11-root strict typecheck and nine-file lint. The complete current candidate
still failed `tsc --noEmit` on `users/[id]/grant-credits/page.tsx:124`:
the real grant function's `description` is `string | undefined`, but the
candidate passes `string | null`. The concrete diagnostic was sent back for
correction; the simulated harness does not establish real RBAC or database
behavior.
The follow-up `2026-10-31-pro-form-description-fix.zip` is 14,148 bytes,
SHA-256 `f38bb80dda3d8df1b0fd3414c5fe667a73f345c2079d33b865b4c95764d68605`.
Its manifest verified, its source delta was applied in the isolated worktree,
and 92 updated mocked admin tests passed. A full-source candidate with all
three form deltas passed TypeScript and the 77 `test:aitalk` tests; its lint
still failed with 148 errors and 216 warnings. A first production-build attempt
encountered sandbox DNS failures for fonts.googleapis.com and was interrupted;
it is not a successful build. A further isolated build with local cloned
dependencies and access to public fonts passed OpenNext (exit 0), with CSS and
Edge runtime warnings. The three reviewed form deltas were then merged into the
local checkout; file comparisons against the tested snapshot passed, with the
later grant-description hash superseding the earlier incremental hash. Real
Server Action transport, authorization and payment cancellation have not been
verified against production; no code was committed or deployed.

After merging the form deltas, checkout lint reports 148 errors and 216
warnings (exit 1); the checkout's `test:aitalk` ran 77 tests with no failures
or skips. A separate React UI review was started at
https://chatgpt.com/c/6ae536cf-3ebc-83ec-9f78-a356ed94ba86 using
`aitalk-react-ui-lint-20261031.zip` (171,959 bytes, SHA-256
`20baf21cfed9328d3dea43cd70d4fa9803d74d9b1a83bd9f405150dd182bf2e8`).
Its selected-source snapshot is based on HEAD
`3bcef9af9a83016e756a7a4b08c8c0ee43e0300b` plus local changes; it was scanned
for common credential patterns before upload and contains no env files or
repository metadata. The conversation is an external review, not evidence of
an accepted change or production validation.
The independent table/caller type review was started at
https://chatgpt.com/c/6ae53761-bae4-83ec-97b7-5e3910cb027b with
`aitalk-table-lint-20261031.zip` (222,312 bytes, SHA-256
`421cb9c36738a4042b3d69a37bf695276a7a03bd2744ffd15c2d22c7a7fba9b6`).
It contains only selected application source/configuration and underwent the
same common credential-pattern scan; no env files or Git data were included.
The independent legacy chat review was started at
https://chatgpt.com/c/6ae538b2-a778-83ec-a16c-22d2ae6a8154 with
`aitalk-chat-lint-20261031.zip` (203,349 bytes, SHA-256
`5498f19e19d9dd1fe57def1013d2a2c094cdb44e272541959902d0c751e44b7d`).
It contains selected source only, with common credential-pattern scanning and
no env files or real chat data; the shared AI-elements sources are reference
only and excluded from its proposed edits to avoid concurrent overlap.

The checkout subsequently narrowed optional local MDX frontmatter fields and
added tests for valid strings, YAML dates and malformed optional values. Its
latest lint run reports 145 errors and 216 warnings (exit 1); `test:aitalk`
now runs 79 tests with zero failures or skips. The updated full-source
candidate using lockfile-matched dependencies passed TypeScript. Invalid
optional metadata is filtered rather than blindly passed to rendering; no
production content migration or real production validation was performed.
The security settings page currently renders neither its unused password form
nor a deletion workflow; both visible buttons link back to the same page. Its
unused password handler does not update a password. This is an independently
confirmed product gap, not a completed feature or production-tested flow.

The same database review conversation received an updated selected-source
follow-up `aitalk-database-lint-followup-20261030.zip` (191,092 bytes, SHA-256
`a9d41a871b22e09f43004eed85c93c56c157c7d39e3718c7bf99f3ad546b9ddf`),
scanned for common credential patterns. Its proposed result is not yet accepted; it must not
present D1 callback behavior as atomic or MySQL input echoes as selected rows.

The database reviewer subsequently reported a local PostgreSQL credit race.
Codex independently reproduced it against the current actual `consumeCredits`
model, Drizzle 0.44.5 and an isolated PostgreSQL 14.18 instance using a
simplified credit table and fictional data: after a grant of 10, two
concurrent transactions recorded consumption totaling 17, balance was 0, and
the second consumption record had an empty detail list. An explicit
`pg_stat_activity` lock-wait check coordinated the race. The local PostgreSQL
instance used a private Unix socket with TCP disabled and was stopped after
the test. The forensic fixture is saved as `2026-10-31-credit-race-repro.txt`
(SHA-256 `1556fefe3f1d51cc181b30325135c1d70406cc17593941859f9221da0215fbb8`);
its disposable socket is no longer active and the file must not be run against
production. This is not a production-data test. Source inspection confirms the
unlocked preliminary sum, empty locked-batch break and missing post-loop
remaining-amount check before writing the consumption record. A separate
business correction and real-database regression tests were requested, with
explicit D1 non-atomic behavior. Stage-two attachment downloads timed out; no
stage-two code has been accepted.

The subsequent independent credit-consumption delivery
`2026-10-31-pro-credit-consumption-tests.zip` is 1,033,100 bytes, SHA-256
`3a596f1d0412307f0163b20584288c4083749665a75e5b0670dee255daad4305`.
Its internal hashes verified, including stage-two and business patches; the
business patch was applied in an isolated Git worktree after the relevant
stage-two files (the overlapping order file was excluded to preserve an
existing payment candidate). A full-source candidate with both patches passed
TypeScript. The independently rerun 33 protocol-double tests passed.
With a locally adapted disposable Unix-socket-only PostgreSQL 14.18 fixture,
20 named real-database subtests passed, including lock contention, multi-page
consumption and rollback; TAP reports 21 including its parent. The wrapper
itself ended with a zsh read-only `status` variable error after the test had
already completed; the saved TAP log records zero test failures. This was not
a production test. The patch deliberately rejects D1 paid credit consumption;
external transactions must propagate errors and be genuine atomic transactions.
An independent disposable MySQL 8.0.27 InnoDB run passed 18 named subtests
(19 TAP tests including the parent), after adjusting the fixture version and
startup timeout for the locally installed server. The native algorithm tests
inject the MySQL schema; one characterization confirms the unchanged actual
application schema barrel exports PostgreSQL and fails against MySQL with
`ER_TRUNCATED_WRONG_VALUE`. That characterization passing is evidence of an
unresolved compatibility issue, not evidence that MySQL application wiring
works. The first MySQL attempt timed out before startup and was retained as a
failed local attempt. These limitations require separate review before merge.

The separate AI refund delivery `2026-10-31-pro-ai-refund-tests.zip` is
714,630 bytes, SHA-256
`0f9819120b52ffdeb0377743b31a57da9efde7689846e1bff61b9d9bc9269bc0`;
its 10,522-byte patch SHA-256 is
`068f015e7ef9bdec1a5d819391bee8cc461f207aa7fe6a5e9fde250986cb74aa`.
Its manifest verified; it was applied after the credit candidate in the
isolated Git worktree and a complete-source candidate passed TypeScript.
Independent reruns passed 61 mocked protocol cases and, using adapted local
fixtures, 33 named PostgreSQL 14.18 and 33 named MySQL 8.0.27 tests. TAP
counts include an additional parent per native suite. The local MySQL
algorithm cases inject the MySQL schema; the real application schema wiring
remains incompatible. Tests model query/webhook callers at the model boundary,
not the missing HTTP handlers or real provider events. D1 refunds are refused
before DB access rather than described as atomic. TAP logs are retained in
this directory. None of these candidate business patches has been merged or
deployed; historic invalid refund details may now fail closed and require
separate review.

During browser accessibility inspection, an unrelated browser extension
exposed a URL containing a value labeled as an API key in tool output. The
value was not included in the source archives and was not intentionally used.
Treat it as potentially exposed and rotate it with that extension's provider.

On October 31, direct lint in the working checkout reported 179 errors and
233 warnings before the two subsequent CLI argument-type fixes. The refreshed
snapshot lint still failed with 177 errors and 233 warnings. Scoped ESLint
for the seed and traffic import scripts passed after those fixes. Both scripts
also completed `--dry-run` against a local fictional CSV, without database
writes; the standard `tsx` CLI could not create its IPC socket in the sandbox,
so the runs used Node's `--import tsx` entry point with a cleared environment.
Direct checkout TypeScript failed with 15 diagnostics involving missing or
mismatched installed dependencies and generated documentation artifacts; this
must not be represented as a successful checkout typecheck. A separate
snapshot using dependencies installed for the current lockfile is used for
independent application checks; no existing checkout dependencies were
overwritten. The refreshed snapshot passed `tsc --noEmit` and all 77
`test:aitalk` tests. These checks do not verify live authentication, payment,
provider behavior, or a production deployment.

The AI failure-correction delivery `2026-10-31-pro-ai-failure-correction.zip`
is 140,203 bytes, SHA-256
`be1a863032a97aad668c3e27c72c283ac91b8c80639d0cb9721896435a4547d7`.
Its internal checksums passed and its delta was applied after the preceding AI
patch in the isolated Git worktree. In an independent partial-source harness,
280 mocked adapter contracts passed; 81 mocked route/model behavior checks
passed and 20 additional tests deliberately reproduced known unresolved gaps.
Scoped lint and type checks passed, as did full TypeScript on a complete source
candidate using lockfile-matched dependencies. This does not validate actual
database isolation, provider behavior, concurrent refunds or generation
idempotency. The candidate remains unmerged pending financial-boundary review.

The payment security follow-up `2026-10-31-pro-payment-security-tests.zip` is
620,877 bytes, SHA-256
`4ff50fa72d9daf5e5f0a9afe3e5ea9817ad755ecfffcbfcff40a6d2eaf2f5fb3`;
its 151,276-byte patch SHA-256 is
`ebe3189131bb685171450c5a2584461fa5c883a4d3e5ed0001bcf1a9991b2052`.
The archive manifest verified. A separate detached Git worktree was overlaid
with the exact prior reviewed baseline, the increment applied, and all 23
candidate manifest files verified. Independently running the supplied harness
on Node 22 yielded 489 named tests passing, including 38 actual model tests
against disposable SQLite; provider requests and many caller dependencies
were mocked. Four scoped typechecks passed; two existing model lint errors and
the partial attachment's 21 missing-module diagnostics remained explicitly
reported. A full-source candidate passed TypeScript. No real payment, provider
sandbox, production database, PostgreSQL/MySQL payment concurrency, or live
historical order behavior was tested. The patch explicitly blocks new PayPal
subscription checkout and may reject legitimate paid transactions lacking its
required evidence, taxes, discounts, currency support or historical bindings;
existing subscriptions may continue to be charged externally. This candidate
is not accepted for production or merged merely because its tests pass.
The actual D1 adapter invokes transaction callbacks without atomic rollback;
the candidate's parent-row updates followed by later error paths therefore
cannot be justified by its transactional SQLite tests. This concrete boundary
was returned to the reviewer for a fail-closed or genuinely atomic design,
including checks before the first payment-settlement write.
The subsequent `2026-10-31-pro-payment-d1-tests.zip` is 839,289 bytes,
SHA-256 `253cf41f97b58b4f3a3b924bc683dffcf5f436f324006b134b2a737a4749783e`;
its 7,954-byte incremental patch SHA-256 is
`9627df489939032fec5e7d281eabee97782d24d8172a49896df01e3b0c465c47`.
The manifest, isolated Git worktree and 24 candidate file hashes verified;
the full candidate TypeScript check passed. On Node 22, the independent
limited harness passed 588 named cases, including 95 simulated refusal
checks and four intentionally reproduced old partial-commit scenarios. It
does not test real D1 or provider operations. Source review found an omitted
caller: `settings/billing/cancel/page.tsx` calls the external provider before
the guarded local subscription update, so D1 could cancel remotely and then
fail to update locally. This was reported for correction, and the payment
candidate remains unmerged. Stripe's documentation distinguishes HUF/TWD
two-decimal charges from special payout rules; a blanket rejection is a
conservative compatibility restriction, not a general two-decimal charge
limitation.

The current cancellation caller and form contracts were supplied to the
payment reviewer in `aitalk-cancel-followup-20261031.zip` (5,901 bytes,
SHA-256 `0d13e0e64561b3e42ef49f663f2cc86cd048842b435cabd6424ae875677b1786`)
after a credential-pattern scan. The follow-up requests actual server-action
tests proving D1 rejects before any remote cancellation, while explicitly
retaining the non-D1 remote-success/local-failure reconciliation risk. No
real cancellation was performed.

The follow-up `2026-10-31-pro-payment-cancel-tests.zip` is 519,029 bytes,
SHA-256 `3ab927739f6399e9ec1fec366cb9a010cd1bd9ad57db4ef67c05d9a5f2896b63`.
Its internal manifest and prior D1 bundle verified. The two-line action guard
increment was applied to the isolated payment worktree after the exact current
form files were matched by hash. Independent Node 24.19.0 tests passed 45/45:
42 candidate cases, two remaining-risk demonstrations, and one baseline
counterexample. Scoped lint and type checks passed; results are saved in
`2026-10-31-cancel-independent-tests.json`. These use mock auth/provider/DB,
not real cancellation or Next server-action transport. D1 cancellation is
refused, and remote-success/local-failure reconciliation remains unresolved;
the wider payment candidate is still not merged or production-ready.
An initial full-candidate type check failed because that older payment snapshot
had old admin/form files alongside the newer form contract. After synchronizing
the independently accepted form source in the temporary candidate, the full
candidate TypeScript check passed. No live application files were replaced by
this synchronization.

An attempted local type-only change to locale-message merging was withdrawn:
inspection found arrays and booleans in actual translation JSON, so treating
every leaf as a string would misrepresent the runtime data. The existing lint
finding remains until a sound boundary can be verified. The current checkout's
81 AITalk tests and `git diff --check` pass; this is not a production release
or a substitute for the remaining full-source acceptance checks.

The pricing page's referral value and caught error are now narrowed without
`any`. Its referral helper retains the cookie fallback lazily and rejects
non-string global values; two offline tests cover precedence, malformed values
and the lazy fallback. The page still has two React effect lint findings. No
checkout or external payment was invoked by these tests.

The remaining pricing React state findings were delegated separately to
https://chatgpt.com/c/6ae53cda-4d24-83ec-8cf8-ef926c9ebd8e with the scoped
`aitalk-pricing-react-20261031.zip` (169,306 bytes; SHA-256
`212b0a16f854982e96291333ee8a07e51ea26652e16c3755254e4e3107b30e16`),
based on commit `3bcef9af9a83016e756a7a4b08c8c0ee43e0300b` plus local changes.
The archive was scanned for common credential patterns before upload; no
matches were found. It excludes local environment files and production data.

The table reviewer delivered `2026-10-31-pro-table-lint-fix.zip` (248,473
bytes; SHA-256
`605634105901aa15f7cbaaeed32b1aae424b7aa47458054a2c368aa3661b82f5`).
Its internal manifest verified and the patch applied in a detached Git
worktree. A complete-source candidate passed TypeScript. An independent Node
22 rerun passed 124 named SSR / mock / differential tests; the machine's pnpm
9 offline store lacked a required tarball, so the rerun linked existing local
dependencies and is not claimed to reproduce the reviewer's frozen pnpm 11
environment. Counts are saved in `2026-10-31-table-independent-tests.json`.
Source review found unbounded iteration over action arrays up to 4,294,967,295
entries, and an unguarded `Array.isArray` call for revoked proxies. Both were
reported for correction before the candidate was merged.
The follow-up `2026-10-31-pro-table-actions-fix.zip` is 32,285 bytes, SHA-256
`6e3e623f2ac4c11fc83e41b03406245c5e7a513eb6729d4efce9e95f5ac71c6e`.
Its manifest and before/after hashes verified in the isolated worktree. The
increment sets a 256-slot ceiling and explicitly throws for excess input;
real project action menus reviewed contain only a few actions. Independent
Node 22 runs passed 26/26 additional boundary checks (including a giant sparse
array in a watchdog-controlled worker) and the original 124/124 SSR/mocked
regressions. The 26-case summary is saved in
`2026-10-31-table-boundary-independent-tests.json`; these are not browser or
real database tests. The full-source candidate passed TypeScript, targeted
ESLint and 81 application tests. A synthetic Chrome fixture passed menu and
keyboard checks at two viewport sizes; details and limitations are in
`2026-10-31-table-browser-check.md`. A combined build first failed with ENOSPC
during static output, and a subsequent clean-cache attempt could not resolve
Google Fonts in the sandbox. A network-enabled, credential-free retry was
attempted; no deployment is implied. Only this task's temporary `.next/cache`
and isolated cancellation-harness `node_modules` were removed to reclaim
space; their source archives and the retained test results remain available.
The network-enabled retry subsequently failed with ENOSPC as the shared disk
filled again. Its temporary build cache was removed a second time; no other
project or Xcode files were touched. After the concurrent build ended, a later
combined table plus React candidate completed OpenNext successfully. Since it
also included the unmerged React candidate, a separate build matching the
then-current checkout was run successfully; source contents were compared excluding
dependencies, generated files, environment files and engineering evidence.
The two table increments have now been applied locally after the isolated
checks. All 30 changed or added paths were compared byte-for-byte with the
independently tested worktree and matched. The outstanding full build still
prevents treating the combined checkout as release-ready. Post-merge, the
checkout had 136 lint errors and 202 warnings; all 81 AITalk tests and
`git diff --check` passed. The table-only current-source candidate subsequently
completed an OpenNext build successfully.

Two RBAC maintenance scripts then had 12 `any` annotations/assertions removed
without changing runtime expressions. Independent esbuild transforms produced
byte-identical JavaScript before and after; the two-file lint and full-source
TypeScript checks passed. `assign-role.ts` without arguments produced the
expected usage error without database access. The initializer was not executed
because it writes permissions. Current whole-checkout lint is 124 errors and
202 warnings. After synchronizing these type-only edits, the complete-source
isolated candidate passed TypeScript and OpenNext build; the current checkout
again passed all 81 AITalk tests. The build used no project credentials and is
not a production deployment or proof that remaining lint errors are resolved.

Authentication lint and verification UX are being reviewed separately at
https://chatgpt.com/c/6ae53dfb-f2d8-83ec-a49f-e9c7e007144c with
`aitalk-auth-lint-20261031.zip` (193,386 bytes; SHA-256
`d6ef82f76887eea449929b74ee1e99911433b47de2c0322cbee0e7b87cc36314`),
based on the same commit plus local changes. Common credential-pattern scan
found no matches. An isolated compile experiment showed that the auth session
user is not assignable to the full database User (`locale`, `utmSource`, `ip`
and image nullability differ); that experiment was not applied to the checkout.

The separate React UI delivery `2026-10-31-pro-react-ui-fix.zip` is 266,697
bytes, SHA-256 `698aaf4f6a46c6b761527bd8e52af7b70d5be6b357e658bd6fbf554c7765bf3a`;
all 63 manifest entries verified. Its patch was applied in a detached Git
worktree and a complete-source candidate; TypeScript passed. Independently,
Node 24.19.0 ran 97/97 DOM/SSR/fault-injection tests, and isolated local Chrome
154 ran 42/42 component-fixture checks with outside requests blocked. Results
are preserved as `2026-10-31-react-independent-dom.json` and
`2026-10-31-react-independent-browser.json`. The runner uses explicit missing
module mocks, existing project dependencies, and separately installed locked
test tools; these are not full-app hydration, real-device, or production
tests. The candidate passed 81/81 application
tests, target ESLint, complete-source TypeScript and an OpenNext build; these
checks do not override the concrete icon regression below, so it is not merged.
Independent inspection of the real locale JSON found a compatibility regression:
the installed Lucide module exports `Home` as the same component as `House`,
but its `icons` registry has no `Home` key. The proposed SmartIcon registry
lookup would therefore show the fallback for `Home` in the English and Chinese
admin and chat sidebars. This evidence and the affected file locations were
returned for correction; the candidate remains unmerged despite passing its
fixture tests.

An isolated combined candidate was constructed from the current local source
plus the previously reviewed DB, credit-consumption, AI-refund and AI-provider
increments; it passed full-source TypeScript. The two RBAC scripts had already
received equivalent type-only changes locally, so they were excluded from the
old DB patch rather than overwritten. Independent call-chain review found a
new D1 safety gap: `api/ai/generate/route.ts` calls `aiProvider.generate` before
`createAITask`, while the proposed `assertCreditConsumptionSupported` is in
`createAITask`. A D1 request with sufficient credits could submit remotely,
then fail before saving the task or consuming credits. This is a source-level
finding, not a real provider test. A subsequent isolated probe executed the
actual combined generate route, `createAITask` and credit guard with a synthetic
provider and DB. It observed one simulated provider submission followed by the
D1 guard error and zero local write attempts. This confirms the ordering under
the supplied mock boundary; it does not establish current production D1
availability or real billing. The combined candidate is not merged; the guard
must be moved before the provider operation and independently tested.
The prepared, credential-pattern-scanned follow-up archive is
`aitalk-ai-d1-ordering-20261031.zip` (164,956 bytes; SHA-256
`ae3c3bea095fa06768b4f281f86c827546d55df9ce6d95a3787fa131062021c0`).
It contains the combined route/models, lock files and synthetic probe source;
the probe build script uses local paths and requires adaptation elsewhere.
It has not yet been uploaded because Chrome is awaiting profile selection.
In a separate local experiment only, placing the existing consumption guard in
the generate route before the provider call reduced the synthetic D1 scenario
to zero provider submissions and zero local write attempts. This experiment
is not merged. Two more mocked probes showed PostgreSQL and MySQL settings
reached the provider and deliberately failing transaction boundary, proving
only that this guard does not reject those settings. They do not establish
successful DB integration, remote idempotency or concurrent reservation safety.
