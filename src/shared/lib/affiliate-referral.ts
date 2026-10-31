/** Use the provider's string referral when present; otherwise use the cookie. */
export function selectAffiliateReferral(
  providerValue: unknown,
  readCookie: () => string | undefined
): string {
  return typeof providerValue === 'string' && providerValue
    ? providerValue
    : readCookie() || '';
}
