# Apple login and shared App/Web account — 2026-10-16

Status: source audit and first local safeguard only. Not configured or verified
end-to-end. No deployment, account merge, credential rotation, or migration done.

## Existing architecture (verified in local source)

- Flutter: `../aitalk/lib/utils/SupabaseUtil.dart` already uses Apple native
  credentials, SHA-256 nonce and Supabase `signInWithIdToken`.
- iOS bundle: `im.aitalk.app`; Runner includes the Apple sign-in entitlement.
- Web: `src/features/aitalk/ui/login-client.tsx` already initiates Apple OAuth;
  callback routes complete the Supabase flow.
- Both clients target the same default Supabase project. Deployed web environment
  overrides and Apple provider configuration still need verification.
- Both access `user_learning_plans`, `user_learning_plan_items`,
  `user_lesson_progress`, and `get-usage`. Sharing depends on the same authenticated
  Supabase UUID, not matching display names or copying device caches.
- Web template Better Auth/payment subscription models are a separate subsystem;
  do not use them as a second AITalk membership authority.

## Implementation sequence and boundaries

1. Verify Apple's web Services ID is associated with the existing native primary
   App ID. Supabase Apple client ID configuration must accept both identifiers;
   follow current provider guidance for ordering (web Services ID first).
2. Verify Apple return URL points to the project's Supabase `/auth/v1/callback`;
   separately allowlist the production website callback URLs in Supabase. These
   are two different callback layers. Do not weaken redirect validation.
3. Preserve a single Supabase UUID. Existing email/Google customers must sign in
   to their existing account before explicitly linking Apple. Private relay email
   can differ from their prior address. Never automatically merge accounts based
   on names, client-supplied email, or subscription receipts. Duplicate accounts
   require verified ownership and separately authorized data reconciliation.
4. Keep membership authoritative on the backend. Authenticate receipt verification
   and derive the customer from the verified session, not request `userId`.
   Validate app/product/environment and receipt ownership; handle renewal,
   expiration, refund, revocation, restore and duplicate notifications idempotently.
5. Both clients refresh membership and current learning plan after authentication,
   foreground/resume, purchase restore and completed learning mutations. Do not
   claim realtime cross-device updates until refresh behavior is implemented/tested.
6. Preserve learning-plan IDs and completion history when switching clients. Do
   not recreate plans simply because a new client signs in. Retain RLS isolation.

## Security findings requiring follow-up

- `../aitalk_ef/supabase/functions/verify-purchase/index.ts` contains a hardcoded
  App Store shared secret and logs receipt request data. Treat that credential as
  exposed; rotate through the account owner and use server-only secret storage.
  No credential value is reproduced here or sent to an external reviewer.
- That handler consumes request-body `userId`; authenticated identity binding and
  existing transaction ownership need hardening before shared membership approval.
- `get-usage` dereferences the returned user without checking authentication failure
  and may write usage data. Do not invoke it as a supposedly read-only production
  test. Audit errors, ownership filters and provisioning races.
- Existing completion writes remain non-atomic (see prior deployment checkpoint).

## First local change

Web account page now distinguishes unavailable/missing membership from explicitly
expired membership. The canonical backend status takes precedence over the legacy
camelCase alias. This presentation helper grants no entitlement.

## Acceptance matrix (not yet executed)

- Same Apple account on iOS and web resolves to identical Supabase user UUID,
  including Hide My Email; cancel/retry cannot leave the login UI stuck.
- Existing email/Google user links Apple without losing UUID, purchase ownership,
  profile, plan, lesson progress or saved items. A conflicting identity is rejected.
- Sandbox purchase/restore reflects on web after refresh; expiry/refund/revocation
  removes access on both. Repeat notifications and concurrent restores are safe.
- Tampered customer IDs and another account's receipt cannot grant membership.
- Learn on one client, refresh the other, and compare plan ID/current lesson/status;
  read failures must not create a new plan or present membership as expired.
- Test desktop and mobile browser callback handling; native device Apple flow needs
  human authentication. No production user data is modified for acceptance.

## External approvals / configuration

Need authorization before changing live Apple/Supabase provider settings or rotating
production credentials. Account owner performs login, 2FA and Apple consent. Never
request passwords, cookies, codes or private signing keys in chat. Database changes,
if required, need separate migration authorization. No new source ZIP is uploaded
while receipt credentials remain in the source scope.

## Official references checked

- https://supabase.com/docs/guides/auth/social-login/auth-apple
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://developer.apple.com/help/account/capabilities/group-apps-for-sign-in-with-apple/

Web Apple OAuth client secrets require periodic rotation; plan ownership and expiry
monitoring as an operational requirement, not merely a one-time integration.
