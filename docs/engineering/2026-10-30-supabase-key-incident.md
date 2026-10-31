# Supabase legacy service key exposure — 2026-10-30

## Event and containment

The authorized Chrome window was already displaying the project's legacy API-key
page when its accessibility tree was read. The legacy `service_role` key appeared
in the tool output. It was not deliberately copied to a source package, report,
repository, or ChatGPT Pro; it should nevertheless be treated as exposed in the
tool record. This does not establish that it was published on the open internet.
The browser was navigated away from the key page. The key value is intentionally
not recorded here.

Do not revoke the legacy JWT secret or disable legacy keys without a tested
migration: deployed mobile App versions contain the legacy public `anon` key, and
legacy service-role clients and existing user sessions can also be affected. The
current service key remains in use until a staged migration is complete.

## Known consumers to inventory

- Web: server-only `src/features/aitalk/supabase/complete-course.ts`, plus public
  Supabase initialization and build/runtime variables. The new completion path is
  not deployed yet.
- Flutter App: `lib/utils/SupabaseUtil.dart` initializes the client with the legacy
  public key. Installed App versions must be considered, not just local source.
- Edge Functions: local source references the legacy service-role environment in
  `get-usage`, `invite-user`, `ip-address`, `openai-api`, `openaiwss`, and
  `pay-callback`. Confirm actual deployed versions and all remaining functions.
- Check Cloudflare Workers, database webhooks/pg_net, scheduled jobs, third-party
  integrations, CI, operational scripts and other private clients independently.
  A source search cannot prove this inventory complete.

## Safe migration plan — not yet executed

1. Obtain an isolated Supabase environment and test data, inventory live callers
   and deployed versions, and confirm rollback and monitoring. Do not export keys.
2. With the owner handling credential entry in the dashboard, create scoped new
   publishable/secret API keys alongside legacy keys. Test each backend separately;
   never paste key values into chat, logs, a source file, or the build environment.
3. Migrate Web and App clients to the publishable key and backend consumers to
   appropriate secret keys. New key formats are not JWTs; check header behavior,
   SDK versions and function authorization per consumer. Do not disable JWT
   verification without independently implementing and testing authentication.
4. Release and observe Web, Edge and mobile updates. Consider older installed App
   versions, active sessions, webhooks and external integrations before disabling
   legacy keys. Test login, RLS, membership, plans and course progress with the
   authorized test account and record aggregate outcomes only.
5. Only after all consumers are confirmed migrated, plan legacy-key deactivation
   and signing-key rotation/revocation as a separate, coordinated owner handoff.
   Preserve a tested rollback path. Disabling legacy keys is not equivalent to
   rotating the signing key, and either can interrupt old clients.

References: [Supabase key migration](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys),
[JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys),
[legacy-key rotation guidance](https://supabase.com/kb/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd).
