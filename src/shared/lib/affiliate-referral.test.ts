import assert from 'node:assert/strict';
import test from 'node:test';

import { selectAffiliateReferral } from './affiliate-referral';

test('selects a nonempty provider referral before the cookie', () => {
  assert.equal(
    selectAffiliateReferral('provider', () => {
      throw new Error('cookie read');
    }),
    'provider'
  );
  assert.equal(
    selectAffiliateReferral('', () => 'cookie'),
    'cookie'
  );
});

test('ignores malformed provider values and falls back safely', () => {
  assert.equal(
    selectAffiliateReferral({ id: 'bad' }, () => 'cookie'),
    'cookie'
  );
  assert.equal(
    selectAffiliateReferral(42, () => undefined),
    ''
  );
});
