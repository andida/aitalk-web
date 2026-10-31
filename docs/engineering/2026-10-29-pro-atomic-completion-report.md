# AITalk atomic course completion review

## Scope and source integrity

This review used only `atomic-course-review-20261029.zip` as the source baseline.

- Received size: **29,065 bytes**
- Received SHA-256: **628a7f7786173966131d486de65b23559ec4c14c2779992c0d7d8e493be67a78**
- Sender-recorded size/hash: exact match
- Files in source package: **13**
- Production access, database writes, migration execution, deployment, credential retrieval, and real learner operations: **not performed**

## Executive conclusion

The baseline had several confirmed defects that were not fully exercised by its existing tests. The patch corrects the smallest coherent server/Web/SQL boundary for atomic guided-course completion:

1. A malformed Tutor score could be clamped or rounded into a valid score before persistence.
2. Guided completion could proceed without a server-resolved current owned plan, and browser plan IDs were trusted too heavily.
3. Active-plan validation did not enforce language and level consistency, which is unsafe because historical L1–L5 items may remain in the same non-destructive plan.
4. Retry recovery identified a “canonical” report using client-forgeable JSON metadata.
5. Report and transcript validation was incomplete and used character rather than byte limits in SQL.
6. Nullable legacy state could bypass completion or produce null arithmetic.
7. Late Start writes could replace the completed row’s plan, downgrade a completed plan item, or point the plan back to a completed lesson.
8. Advancement used `plan_order / 1000` as the authority and could be confused by malformed historical orders, foreign-language items, or stale plan-item status.
9. The supplied PostgreSQL test did not cover both lock orders, mixed-score duplicate recovery, adjacent-lesson concurrency, real authenticated-role writes, protected-report forgery, level mismatches, or all four write-stage rollback points.

The patch does **not** prove production acceptance. The migration and PostgreSQL integration suite were not run here because the private restored database and a PostgreSQL runtime were not included.

## Confirmed findings and corrections

### 1. Invalid Tutor scores were normalized into valid grades

**Baseline:** `saveTutorCompletion` accepted any parseable finite score. `buildPracticeReport` then clamped and rounded it, so `-1`, `101`, and `2.5` could become `0`, `100`, and `3`.

**Correction:**

- `readTutorCompletionScore` now requires an integer from 0 through 100 before a commit is attempted.
- `isTutorPracticeReport` validates the full persisted report shape.
- SQL independently requires a numeric integral score from 0 through 100.
- Unit and PostgreSQL test cases cover negative, over-100, fractional, missing, malformed, and multibyte-oversized values.

Source locations:

- `aitalk-web/src/features/aitalk/lib/tutor-completion.ts:9-103`
- `aitalk-web/src/features/aitalk/lib/tutor-completion.test.ts`
- `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql:75-151`

### 2. Plan fallback and ownership were incomplete

**Baseline:** guided completion only resolved a plan when the browser supplied `planId`; otherwise the service RPC could receive a null plan. The browser-selected plan was checked only by fetching its items. The database did not require an active plan or matching language/level.

**Correction:**

- The Server Action always resolves an owned active plan for guided mode.
- The browser plan ID is only a preference among server-fetched owned candidates.
- The resolver filters by lesson membership, owner, active status, normalized language, and normalized L1–L5 level.
- SQL rechecks plan ownership, active status, item ownership, language, and level under a plan row lock.
- Missing, inactive, cross-user, wrong-language, and wrong-level plans fail before any write.

Source locations:

- `aitalk-web/src/features/aitalk/actions.ts:245-294`
- `aitalk-web/src/features/aitalk/data.ts:566-607`
- `aitalk-web/src/features/aitalk/lib/course-plan.ts:9-34`
- `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql:153-191`

### 3. Canonical retry reports were forgeable through normal attempt metadata

**Baseline:** duplicate recovery selected attempts whose `metadata.completion_version` was `1`. Authenticated clients must retain normal own-row attempt writes, so they could create indistinguishable metadata.

**Correction:**

- Added nullable `lesson_attempts.trusted_completion_version` with allowed value `1` only.
- Added one partial unique index per `(user_id, lesson_id)` for trusted completion.
- Added a trigger that rejects non-service insertion, mutation, or deletion of protected attempts while preserving existing untrusted attempt behavior.
- Retry recovery reads only the protected marker, not user-writable metadata.
- Web types include the new optional field.

Source locations:

- `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql:3-47`
- `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql:201-245`
- `aitalk-web/src/features/aitalk/types.ts:230-245`

### 4. Duplicate completion and race handling were under-specified

**Correction:**

- A transaction-scoped advisory lock serializes all atomic completions for one learner, including different lessons or plans.
- The owned plan, current plan item, and progress row are locked before the four write stages are finalized.
- The first successful transaction writes one protected attempt and the first completion timestamp.
- Same-lesson retries return the stored protected report and do not increment attempts.
- Concurrent adjacent-lesson completions serialize and end on the correct next same-level lesson.
- Nullable `status` and `attempts_count` are handled with `IS DISTINCT FROM` and `coalesce`.

Source location:

- `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql:153-245`

### 5. Late Start writes could regress completed state

**Baseline:** the progress trigger preserved status, percent, score, count, and timestamps, but did not preserve `plan_id`. There was no equivalent monotonic protection for completed plan items or the plan’s current lesson.

**Correction:**

- Completed progress preserves its original non-null plan ID.
- Completed plan items cannot be downgraded or lose the first completion timestamp.
- A same-level stale update cannot point `current_lesson_id` back to a plan item already marked completed.
- Explicit language/level changes remain allowed.
- Integration tests use `SET LOCAL ROLE authenticated`, set `request.jwt.claim.sub`, assert `auth.uid()`, and use `RETURNING` assertions so an RLS-filtered zero-row write cannot masquerade as a trigger pass.

Source locations:

- `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql:297-378`
- `aitalk-web/scripts/test-atomic-course-completion.mjs:191-369`

### 6. Advancement relied on mutable/malformed plan-order segmentation

**Baseline:** the next lesson was selected by `plan_order / 1000`; historical malformed orders could move across levels. It also did not independently check lesson language or a completed progress row whose plan item remained stale.

**Correction:**

- Advancement joins authoritative lesson data.
- Candidate lessons must be active, in the same authoritative `level_id`, and match the plan language.
- A candidate is skipped when its progress is already completed, even if its item status is stale.
- An old completion changes the plan pointer only when that lesson is still current (or the pointer is null); it cannot regress a newer current lesson.
- Explicit plan level switching remains supported and tested separately.

Source location:

- `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql:247-289`

### 7. Input/report validation and fail-closed service configuration

**Correction:**

- Server Action runtime-checks `text`, lesson ID, optional plan ID, message array entries, and active lesson status.
- Guided mode cannot enter the trusted commit without both a lesson and a server-resolved owned plan.
- The service helper derives `user.id` through `auth.getUser()` and never accepts a user ID argument.
- The service helper validates safe integer IDs, report structure, UTF-8 byte lengths, and transcript JSON-array shape before RPC.
- Transcript byte length is checked before parsing.
- Missing `SUPABASE_SERVICE_ROLE_KEY` throws `Trusted course completion is not configured`; no direct-table fallback exists.
- RPC errors return a generic save failure to the learner rather than silently performing partial writes.

Source locations:

- `aitalk-web/src/features/aitalk/actions.ts:243-377`
- `aitalk-web/src/features/aitalk/supabase/complete-course.ts:1-70`

## Locking and failure atomicity review

The SQL function performs report/transcript validation first, then obtains a per-user transaction advisory lock, validates and locks the plan/item, creates-or-locks progress, writes the protected attempt, completes progress, completes the plan item, and advances the plan. An exception in any statement aborts the containing transaction; the integration suite injects failures at each of these four write tables and requires the pre-call state to remain byte-for-byte equivalent before a successful retry.

The updated integration test includes deterministic schedules for both directions of the Start/completion race:

1. Legacy Start holds progress and plan-item rows first; completion is verified blocked before Start is released.
2. Atomic completion writes first but remains uncommitted; stale Start is verified blocked, then must observe and preserve completed state after release.

It also adds:

- ten simultaneous same-user/same-lesson calls with different scores;
- simultaneous adjacent lessons for one user;
- old-lesson retry after newer advancement;
- malformed cross-level order;
- foreign-language next item;
- stale completed progress with a non-completed item;
- null current lesson;
- last lesson;
- cross-user, missing, inactive, wrong-language, and wrong-level plans;
- anon/authenticated RPC denial;
- protected marker forgery and protected report update/delete attempts;
- four injected write-stage failures;
- nullable legacy progress/item state;
- legacy completed progress without a canonical attempt.

The script now contains **29 named integration checks** when the four injected-failure iterations are counted separately. These checks were added but **not executed in this environment**.

## File manifest

Changed files (9):

1. `aitalk-web/scripts/test-atomic-course-completion.mjs`
2. `aitalk-web/src/features/aitalk/actions.ts`
3. `aitalk-web/src/features/aitalk/data.ts`
4. `aitalk-web/src/features/aitalk/lib/course-plan.ts`
5. `aitalk-web/src/features/aitalk/lib/tutor-completion.test.ts`
6. `aitalk-web/src/features/aitalk/lib/tutor-completion.ts`
7. `aitalk-web/src/features/aitalk/supabase/complete-course.ts`
8. `aitalk-web/src/features/aitalk/types.ts`
9. `aitalk_ef/supabase/migrations/202610290001_atomic_course_completion.sql`

No UI component, route layout, theme, credential file, generated lock file, or unrelated table permission was changed.

## Tests actually executed here

### Passed

1. Attachment byte size and SHA-256 verification.
2. `node --check aitalk-web/scripts/test-atomic-course-completion.mjs`.
3. `JSON.parse(aitalk-web/package.json)`.
4. Strict TypeScript check for the self-contained pure subset:

   ```text
   tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck \
     types.ts lib/course-plan.ts lib/tutor-report.ts lib/tutor-completion.ts
   ```

5. Tutor completion unit tests through Node 22 type stripping: **11 passed, 0 failed**. Node emitted only the expected experimental type-stripping/module-type warnings.
6. TypeScript `transpileModule` syntax diagnostics for all seven changed TypeScript files: **all passed**.
7. Trailing-whitespace scan across all nine changed files: **passed**.
8. Unified patch dry-run, real application to a fresh baseline copy, and byte-for-byte comparison of all changed files: **passed**.
9. ZIP manifest inspection: **9 expected changed files**.

The complete raw local command output is retained in the review work directory but is not itself a claim about the unavailable full repository.

### Attempted but unavailable

`npx --offline prettier@3.6.2 --check ...` failed before formatting because Prettier was not present in the npm cache (`ENOTCACHED`). Therefore Prettier is **not claimed as passed**.

## Tests not executed here

- PostgreSQL integration test: no PostgreSQL server/client, private template database, or `.private-backups` restore was included.
- Migration execution: prohibited and not performed.
- Full repository `pnpm exec tsc --noEmit`: full repository and dependencies were not included.
- Full 41-test suite supplied in the private repository: not available here.
- Production build: full repository and dependencies were not included.
- Full lint: full repository and dependencies were not included.
- Authenticated desktop/mobile E2E: no application runtime, credentials, or test accounts were available.
- PostgREST HTTP invocation using an actual service-role deployment configuration: not performed.

The previously reported “13 PostgreSQL checks, 41 unit/contract tests, tsc, build exit 0 with an existing copy error, and full-repo lint 454 errors/236 warnings” remains **user/Codex-supplied baseline evidence**, not independently rerun evidence from this review.

## Findings versus hypotheses and residual boundaries

### Confirmed boundaries

1. **Shared progress remains compatibility data, not cryptographic proof.** Existing App clients can still write their own progress/attempt rows under RLS. The protected attempt marker identifies only the new canonical server completion. Generic `getLatestLessonAttempt` can still return an untrusted attempt, and legacy direct writes may increase `best_score` or `attempts_count`; callers must not treat those generic fields as proof of speaking competency.
2. **Legacy completed rows do not invent a trusted report.** When progress was already completed before this RPC and no protected attempt exists, the RPC repairs plan state and returns null. This preserves compatibility/history rather than falsely labelling an old client report as trusted.
3. **Transcript authenticity is not solved.** The browser can supply prior message history to Tutor. The patch validates shape/size and prevents direct grade submission, but it does not defeat prompt injection or prove that audio was spoken.
4. **Scoped restore is not disaster recovery.** The supplied evidence covers eight course tables, not all Supabase objects, auth records, grants, extensions, storage, or deployment settings.

### Hypotheses requiring Codex/local verification

1. **Deployment grants:** the isolated script applies a test-only all-sequence grant because the scoped restore does not preserve deployment-wide sequence grants. Codex must verify the production `service_role` already has the required table/sequence privileges; the migration intentionally does not broaden them.
2. **PostgREST role path:** direct `SET LOCAL ROLE service_role/authenticated` exercises PostgreSQL roles and RLS but is not the same as an actual PostgREST HTTP request and schema cache refresh.
3. **Unknown native App transaction order:** the attached Web flow uses separate autocommit requests. If an unattached App transaction holds plan-item/progress locks and then requests the plan lock in the inverse order, PostgreSQL could choose a deadlock victim; that exact native transaction schedule must be checked against App source.
4. **Restore of protected attempts:** a future full restore containing marked attempts must use a restore method that handles the protection trigger intentionally. This package did not test full disaster recovery.
5. **Level representation:** the new trusted path accepts plan levels `1` through `5` and `L1` through `L5` (case/whitespace normalized). Codex should confirm no production active plan uses a different textual level convention.

## Independent rollout gates for Codex

Before rollout, Codex should independently:

1. Apply the patch to the exact private baseline and inspect all nine files.
2. Run Prettier on changed JS/TS files and the repository’s configured SQL formatter, if any.
3. Run full TypeScript and all unit/contract tests.
4. Execute the updated 29-check PostgreSQL suite against the isolated restored PostgreSQL 15 database, including both blocking schedules.
5. Verify function/table/sequence privileges and RLS under actual `anon`, `authenticated`, and `service_role` paths.
6. Verify a failed RPC produces no writes through PostgREST and a retry returns the canonical report.
7. Run the production build independently from lint; investigate the existing copy error rather than treating exit code alone as clean.
8. Run targeted lint on all changed files, while tracking the existing full-repository lint debt separately.
9. Run authenticated desktop and mobile E2E for guided completion, duplicate clicks/tabs, completed-lesson review/free modes, last lesson, and level switching.
10. Configure the server-only service key through deployment secrets, refresh PostgREST schema cache if required, then deploy migration and application in the locally approved order. No secret should be placed in a public variable or client bundle.

## Artifacts

- `atomic-course-completion-review.patch`
  - Size: **60,607 bytes**
  - SHA-256: **b7add86847cd8f1968baa184e64268875291ce3772c8de7c335d51c2bddbc7f4**
- `atomic-course-completion-changed-files.zip`
  - Size: **27,690 bytes**
  - SHA-256: **a17600cbbd26a7c13facad2c1345f8b6c4809a950d99f3ed5b1365fc1ca6850b**

