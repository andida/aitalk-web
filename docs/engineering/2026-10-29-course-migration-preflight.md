# Course migration preflight — 2026-10-29

## Authorization

The user authorized course-related database migrations and content import, explicitly
requiring backup, review and testing before production changes. This does not
authorize unrelated database changes or destructive restore over production.

## Checks and blockers

- Supabase CLI project listing succeeded: linked project `jkdhpfscpoahowolprco`,
  name `aitalk`, ACTIVE_HEALTHY, PostgreSQL 15.1.0.95.
- This confirms management project visibility, not database connection access.
- `supabase inspect db table-record-counts --linked --output json` requested a
  database password and failed with SQLSTATE 28P01 (password authentication failed).
  No password was supplied or printed. Do not retry guessed credentials.
- The existing local DATABASE_URL is not a valid usable connection URL. No value
  was disclosed. `psql` and `pg_dump` are installed; Docker was not found on PATH.
- The Chrome profile containing the signed-in AITalk app has no current Supabase
  dashboard session. The targeted backup page redirects to Supabase sign-in.
- No backup has been created or verified. No production SQL, migration, import,
  credential reset, or deployment was executed.

## Initial content-script review

The existing uncommitted `aitalk_ef` changes were preserved. The L2–L5 script has
an explicit transaction and upserts using lesson language/key, step order, and
translation keys. Upserts modify existing content: they are not a backup and are
not automatically safe to roll back. No DELETE/TRUNCATE/DROP was found by the
initial keyword scan. This is preliminary review, not approval to execute.

The validation SQL checks expected counts and missing fields but does not itself
raise an exception on failed checks. A runner must abort before COMMIT if any check
fails. It must also verify each lesson has the expected unique step types, not
merely the total count of 400. L1 exclusion checks limited to selected L2–L5 keys
do not prove L1 was unchanged; compare before/after fingerprints independently.

## Safe execution sequence once backend access is restored

1. Read actual schemas, constraints, policies, RPC signatures and migration history.
2. Inventory impacted course tables and learning tables without exporting row data
   into chat. Record baseline counts and content checksums.
3. Create a consistent recoverable backup with schema, policies/functions, sequences,
   and affected data/dependencies. Keep sensitive backups outside Git/source ZIPs,
   with restrictive access. Record size, SHA-256, timestamp and restore procedure.
4. Restore into an isolated database and verify schema/row counts before migration.
   A dump file existing or a successful archive listing is not a restore test.
5. Implement atomic completion of attempt/progress/plan advancement, validate user
   and plan ownership, serialize concurrent completions, and prevent direct
   authenticated clients from supplying trusted tutor grades. Do not deploy a
   SECURITY DEFINER completion RPC accepting arbitrary client scores.
6. Test rollback on each write failure, duplicate and concurrent calls, cross-user
   rejection, completed-lesson review, and last-lesson behavior. Preserve earlier
   completion timestamps and never regress an already-advanced plan.
7. Validate content and migration twice against the restored test database, compare
   unrelated/L1 data fingerprints, then schedule scoped production application.
8. Run build and browser acceptance, deploy compatible web code, and verify learning
   state using a designated test account rather than modifying real learner records.

## Human handoff

### Prepared a private local backup entry point

`scripts/backup-course-database.sh` pins the verified session-pooler project and
prompts for the existing database password with terminal echo disabled. It does
not persist the password, reset credentials, or execute database writes. It sets
read-only defaults and writes a custom-format dump into a mode-700 directory under
the workspace's `.private-backups`, outside source repositories. The password is
passed to PostgreSQL tools in the process environment, not on the command line.
This directory must be excluded from all future source packages.

On successful dump it checks archive readability and records size/SHA-256. These
checks deliberately do not claim restoration success. Failed dumps remain marked
`.partial` and must never be treated as completed backups. Shell syntax and the
non-interactive refusal path were checked; no authenticated dump was run.

Computer-use access to Terminal is explicitly disallowed by the environment, so
the agent did not try another UI mechanism to bypass that restriction. The owner
must run the provided local command and enter the existing database password in
their own terminal. No password should be sent in chat. After a successful backup,
isolated restore and migration tests are still mandatory before production changes.

### Correct browser located; database credential remains missing

Native Chrome accessibility located the previously unconnected `card` profile.
The AITalk project `jkdhpfscpoahowolprco` in organization
`gtbnrhqdlwqdegztihwr` is now visibly accessible and Healthy. Browser-account access
is no longer the blocker. Database Backups explicitly states: Free Plan does not
include project backups. No paid upgrade was requested or performed.

The system has pg_dump 18.1. A bounded official npm CLI invocation was also tried;
it reached the linked session pooler but still requested the database password and
failed with SQLSTATE 28P01. Management login does not authenticate PostgreSQL.
Next prerequisite: the owner must securely configure an existing database
credential locally (not transmit it in chat). Do not reset the production password
without assessing other consumers. Once authenticated, take a logical backup and
perform an isolated restore before any migration. No backup or restoration can
currently be claimed, and no SQL write/import/deployment occurred.

### Follow-up after reported dashboard login

Reopened the exact AITalk project URL. The browser redirected to organization
`tcwikujlnconqvxxtmmr` (Anna). A temporary Supabase frontend module-load error was
resolved by refresh. The organization picker then listed only Anna and HookSonar;
the CLI-linked AITalk organization `gtbnrhqdlwqdegztihwr` was absent. Thus browser
login succeeded but AITalk access was not established in this browser account.
The available Anna project was imgedify, not the authorized migration target.

An official newer CLI read-only connection attempt via npm did not return a
database result and was stopped. No backup, restore test, SQL write or deployment
was performed. Do not treat CLI project listing as sufficient database access.

Complete login in the opened Supabase dashboard tab with an account authorized for
AITalk. Do not send passwords, tokens or verification codes in chat. Database
backup connectivity may additionally require securely configuring the existing
database credential; do not reset it casually, as other services may depend on it.
