# Atomic course completion review brief

Baseline: Web main `3bcef9af9a83016e756a7a4b08c8c0ee43e0300b`, plus uncommitted changes in this package. PostgreSQL production 15.1; isolated local integration tests 15.19. No production SQL writes or deployment have occurred in this continuation.

## Objective

Review and correct the smallest complete change that atomically saves a trusted Tutor report, completes lesson progress, and advances the owned plan. Preserve App/Web shared tables, completed-lesson review/free-mode isolation, L1–L5 boundaries, and mobile/desktop behavior.

## Architecture and boundaries

- Next Server Action authenticates the learner, resolves lesson and plan from Supabase, calls the Tutor, and derives the report server-side.
- Browser-supplied reports/scores must never be accepted by a publicly callable completion endpoint. The new RPC is SECURITY INVOKER and executable only by service_role; the server helper derives user ID from getUser(), never from a supplied user ID.
- Existing App still performs direct own-row writes under RLS. A monotonic completed-progress trigger prevents late Start upserts from downgrading completed status, score or attempt count. Do not revoke unrelated App table privileges or break legitimate flows without a compatibility plan.
- New server credential is a deployment prerequisite, not a checked-in value. Never request, print, fabricate or retrieve secrets. Never put a service key into a public variable or client bundle.
- Full transcript authenticity remains a separate issue: clients can submit message history to Tutor. Do not claim that this patch solves prompt injection or proves real speaking competency.

## Evidence and scope

Via MCP, 8 scoped course tables were exported to private storage outside repositories. 2,949 rows were restored into isolated PostgreSQL with constraints/indexes/RLS policies and auth.uid function; all row counts and fingerprints match. No learner records are in this source package. This is not a full Supabase disaster-recovery backup.

The production snapshot already contains 20 English v2_pilot L1 lessons and 80 English v2_full L2–L5 lessons. Applying the existing content import twice to an isolated copy changed no semantic content (timestamps excluded). Do not reimport merely to report an action.

## Required review and deliverables

1. Audit locking, duplicate recovery, ownership checks, malformed inputs, report integrity, last lesson and same-level plan advancement, trigger effects on old App clients, and failure atomicity.
2. Review tests critically. Identify missing race schedules, broken assumptions, privilege issues and restore limitations, with concrete source locations.
3. Provide a minimal complete patch for confirmed defects and additional tests. Include a file manifest and hash of any downloadable artifact.
4. Explicitly distinguish findings from hypotheses, and executed tests from proposed tests. You cannot access the local environment, private repository or production DB; only the attached source is available.

## Acceptance

- At least 10 concurrent same-user/same-lesson calls produce one attempt and stable progress/first completion timestamp.
- Failure in any of the four write stages leaves no partial writes; retry succeeds.
- Cross-user plan and anon/authenticated RPC calls fail; invalid scores cause no writes.
- Old completion retries do not regress a newer current lesson; no cross-level advancement.
- Existing completed progress cannot be downgraded by stale App/Web Start.
- Missing service configuration fails closed with an honest save error, not silent partial-write fallback.
- Typecheck, unit/contract tests, local PostgreSQL integration tests, production build, lint and authenticated desktop/mobile E2E must be evaluated independently by Codex before rollout.

Do not execute migrations, deploy, change credentials, operate real learner records, claim production acceptance, or broaden permissions. Codex is responsible for independent acceptance.
