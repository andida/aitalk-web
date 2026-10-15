# Lessons module hardening — 2026-10-14

## Scope and baseline

Baseline: `main`, `8491c37ddcfe4e9302d2204adf820d3b364308b2`. Changes are local and uncommitted. No push, PR, deployment, migration, production configuration change, or real learner progress mutation was performed.

Prior ChatGPT Pro conversations, source ZIP baseline/hash and rejected deliverables are recorded in [the July engineering record](2026-07-29-aitalk-course-conversation-upgrade.md). This continuation did not upload a new archive or obtain a new Pro review; it must not be described as a newly completed dual-agent acceptance cycle.

## Changes

- Theme initialization now uses literal source text rather than a function serialized by next-themes. The bundled library bootstrap has an inert script MIME type; next-themes remains responsible for interactive theme changes. This avoids server-bundler `__name` references escaping into the executable inline script. Stored preferences are allowlisted and inaccessible storage falls back to the configured preference.
- Lessons load native-language translations in one batch for lesson titles/subtitles and unit headings, falling back to original text when a translation is absent.
- Essential profile/plan load errors propagate to a retry boundary instead of masquerading as an empty learning plan. Added loading skeleton and bilingual retry panel.
- Hero distinguishes Start, Continue and Review; completed courses show a completion message. Completed rows no longer receive a Current badge. Row action labels remain visible on mobile.
- Empty paths link to free practice and learning settings. Existing free lesson selection remains available.
- Added three standalone theme bootstrap regression tests to `test:aitalk`; no dependencies or lockfiles changed.

## Verification

| Check | Result |
| --- | --- |
| `pnpm run test:aitalk` | 14/14 passed: course plan, topics, sidebar identity and theme bootstrap |
| `pnpm exec tsc --noEmit` | Passed |
| Target ESLint for changed theme/UI/route files | Passed |
| `data.ts` ESLint | 13 existing `no-explicit-any` errors outside the new translation function |
| Full `pnpm run lint` | Failed: 455 errors, 237 warnings; same count as prior audit |
| Prettier for all changed source files/package.json | Passed |
| `git diff --check` | Passed |
| `pnpm run build` | Exit 0; Next compilation/typecheck/static generation and OpenNext Worker generation completed |
| `pnpm run cf:check` | Failed: 5 checks (legacy SiteRise worker name, self-reference binding, AUTH_SECRET, SEMRUSH_API_KEY, Cloudflare credentials) |

Build is not clean despite exit 0: OpenNext reports dependency-copy errors for MDX-related packages and a duplicate payment switch case warning. These require runtime investigation before release. The legacy readiness script also needs separate review against AITalk's actual architecture; credentials were not accessed or changed to bypass it.

## Remaining acceptance work

The earlier live audit observed a usable 390×844 layout without horizontal overflow and confirmed the production theme error, but that is not a browser test of these new local changes. This continuation's bootstrap tests run in a VM with synthetic browser objects, not a production Cloudflare browser runtime.

Still required: local/staging desktop and mobile visual regression, theme hydration/toggle checks against the generated Worker, database translation/error-path integration tests, and course start → practice → completion → review E2E using isolated test data. Do not describe the product as fully complete or release-approved on this evidence.

## Follow-up in the same local changeset

- Removed detail-page calls to plan initialization/reconciliation and progress writes. Merely opening a lesson no longer marks it started. The explicit Start action remains the write boundary.
- Detail data failures now reach the retry boundary rather than displaying fabricated empty steps, missing scores, or a false incomplete state. Genuinely absent optional data still uses the existing fallback UI.
- Detail route IDs must be positive safe integers; values such as `12abc`, negative numbers and unsafe integers no longer select a different lesson through `parseInt` truncation.
- Unstarted details show Not started / Start practice. Completed-lesson Start/Review actions redirect without changing the active plan or practice timestamps.
- Progress read errors now abort `startLessonProgress` before any upsert. This prevents a failed read from overwriting existing completion with an initial 10% state. This is not a transaction/concurrency fix.
- Corrected two readiness checks from the old `siterise` worker name to the actual `aitalk-web` name. The self-reference binding was already present; it was a false negative, not a missing binding. No Wrangler configuration was changed. `cf:check` now reports three remaining failures (AUTH_SECRET, SEMRUSH_API_KEY, Cloudflare credentials); legacy secret requirements still need architectural review, not blanket bypassing.

### Follow-up verification

- Rebuilt the final source with `pnpm run build`: exit 0 and OpenNext Worker generated; dependency-copy error messages and duplicate-case warning remain, so this is not a clean release gate.
- `test:aitalk`: 20/20 passed, including six new offline Supabase-double tests for progress error/no-write behavior, completed/existing/new progress, translation batching, missing language and query failures. These are contract tests, not live database integration tests.
- TypeScript passed. Target ESLint for lesson detail and new tests passed. `actions.ts` still has its existing `no-explicit-any` error in onboarding error handling, outside this change.
- Launched the previously generated OpenNext Worker locally with Wrangler (loopback only, no deployment). Login rendered in the in-app browser without captured error/warning logs. Executable bootstrap contained no `__name`; the next-themes serialized bootstrap containing the helper had the inert `application/x-aitalk-theme` MIME type. The root had the expected light class.
- Public login screenshots and DOM geometry checked at 390×844 and 1440×1000: no horizontal overflow (`scrollWidth` equal to viewport width). Unauthenticated `/lessons` redirected to `/login?redirect=%2Flessons`. This is not authenticated lesson UI or full-course E2E validation. No credentials were entered; no production learner data was changed. Temporary servers stopped and viewport override reset.
- Remaining authenticated checks require an isolated test account/data environment. Practice-page essential silent-fallback paths were addressed in the next continuation below. All changes remain local, uncommitted and undeployed.

## Practice-mode safety and responsive regression continuation

### Implementation

- Added `loadCoursePractice`, with explicit read dependencies and seven tests. It reads progress and steps successfully before resolving a mode. For an explicitly selected completed lesson it never calls the mutable active-plan loader, and returns no plan for review or completed-lesson free talk. A progress/steps error aborts instead of creating a guided/scored session.
- Practice profile, plan, topic, progress and steps errors now reach a bilingual retry boundary with a Back to lessons link. Only optional teacher presentation retains its prior fallback.
- Invalid numeric route parameters and missing explicitly selected lessons/topics return not-found rather than silently choosing another lesson. Default practice without a lesson redirects to the course list. Free topic selection still skips course-plan loading.
- Fixed a reproduced responsive defect: nested implicit grid tracks in `LessonPath` expanded to a 606px document on a 390px viewport with a long title. Explicit single-column minmax tracks and minimum-width constraints now allow the existing truncation/wrapping to work.
- Added `scripts/aitalk-lessons-preview.tsx`, a standalone loopback-only static fixture using the real Hero/Path components and built CSS with synthetic data. It is not a Next route, does not bypass authentication, has no database calls, rejects non-GET requests and blocks scripts/form submission with CSP. Run after building with `pnpm exec tsx scripts/aitalk-lessons-preview.tsx`.

### Evidence and remaining limits

- `pnpm run test:aitalk`: 27/27 passed (offline unit/contract tests).
- TypeScript, scoped ESLint for this continuation, Prettier and `git diff --check`: passed.
- Final `pnpm run build`: exit 0, OpenNext Worker generated. Previously recorded copy-error messages and duplicate-case warning remain.
- Full lint: 454 errors, 236 warnings; release gate still fails. No unrelated bulk lint fixes applied.
- In-progress fixture measured document/viewport widths 320/320, 390/390 and 1440/1440. At 390px the Hero action was 48px tall; lesson rows were 88–118px tall. Completed fixture showed Review, 100%, 3/3 complete and no Current badge; empty fixture showed free-practice and settings links. Both also measured 390/390. Final-built CSS was rechecked at 390px. Viewport reset and fixture server stopped afterwards.
- [Mobile fixture screenshot](assets/2026-10-14-lessons-mobile-fixture.jpg), SHA-256 `38e8ef2558ee12d431966f3b27112e7207ee399ebb05ab04f758ad9ddf9cd89a`.
- These are component layout checks, not authenticated E2E. The fixture does not include the authenticated app shell or execute Start/Review actions. Isolated database/auth integration and real voice/tutor completion checks remain outstanding. Server-side completion authorization, concurrency and attempt idempotency are not proven by these mode-selection tests. No production learner data was touched; no commit, push or deployment performed.

## Server completion boundary continuation

### Changes

- Removed the exported `completeLessonAction` and `completeLessonFromPracticeAction` endpoints. The browser no longer submits scores/reports to a standalone completion action. Source-wide search confirmed no remaining references.
- `askTutorAction` now resolves progress, lesson criteria and learner level from the authenticated database context. A persisted completed lesson overrides a client request for guided mode to review. Supplied plan IDs must contain that lesson in the authenticated user's plan items; free/review modes do not forward a writable plan.
- Completion is evaluated on the normalized Tutor response inside the server action, before returning to the browser. Only guided, non-auto-start turns with both completion flags and a finite parseable score are eligible. Missing scores no longer invent the previous 82-point default. A fresh progress read skips already completed lessons before report insertion.
- The browser shows a saved completion only from the server's returned completion report, not merely raw Tutor flags. Save errors retain the Tutor reply and expose the existing retry UI without falsely marking the lesson completed.
- Moved shared report parsing to `lib/tutor-report.ts`; orchestration lives in `lib/tutor-completion.ts` with injected dependencies for offline tests. Client history forwarded to the Tutor is limited to user/assistant messages (100 messages, 4,000 characters each), not client-supplied system messages.
- Removed the swallowed progress read error from `completeLessonProgress`: a failed read must not reset best-score/attempt counters through an upsert.

### Verification

- `test:aitalk`: 37/37 passed. New coverage includes persisted completion overriding requested guided mode, no writes for review/free/auto-start, both completion flags required, malformed/missing scores, sequential duplicate suppression, and progress/report/completion write failures.
- `pnpm run build`: exit 0 and final OpenNext Worker generated; previously recorded dependency-copy error messages and duplicate-case warning persist.
- TypeScript, new helper/test ESLint, all changed-file Prettier and `git diff --check` passed.
- Existing target lint issues remain: one onboarding `any` in `actions.ts`, two effect-dependency and three image warnings in `practice-client.tsx`. No blanket suppressions or unrelated changes were used.
- Tests use injected offline data sources. No authenticated Tutor call, voice service, real-user data, migration, or deployment was used for validation.

### Remaining release risks

This closes the direct client-submitted grade endpoint, not every integrity boundary. Client-supplied conversation history is still not an authoritative persisted session transcript; Tutor assessment/prompt-injection behavior and direct database RLS require separate integration/security validation. Concurrent completions and retries after partial writes are not transactionally idempotent: report insertion, progress update and plan advancement remain separate operations. The sequential-duplicate test must not be described as a concurrency guarantee. An atomic database operation with a unique attempt identity is still needed before claiming exactly-once completion; no database migration was executed or assumed authorized.

The changed client/server action contract also needs authenticated staging verification, including save-failure recovery. This local changeset remains uncommitted, unpushed and undeployed; it is not release-approved.
