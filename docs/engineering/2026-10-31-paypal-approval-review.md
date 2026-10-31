# PayPal approval link boundary — 2026-10-31

The PayPal adapter now checks that the provider response has an array of links and that an approval link has a string href, for both one-time and subscription checkout. Other checkout and settlement behavior is unchanged. Invalid or missing links still result in an undefined checkout URL; this is not evidence of a successfully created checkout.

Six local tests cover normal and malformed responses for both paths. Provider methods are replaced by stubs, and no real PayPal request, payment, account, or production data is involved. Run `pnpm run test:payment-approval`.

This change does not resolve the existing payment metadata, webhook binding, concurrency or Creem subscription renewal issues. Those remain release blockers. The externally requested Pro review has not been obtained for this change because the external browser session is logged out.
