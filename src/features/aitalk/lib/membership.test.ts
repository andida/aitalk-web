import assert from 'node:assert/strict';
import test from 'node:test';

import { membershipLabel } from './membership';

test('membership comes from explicit backend status, not a default', () => {
  assert.equal(membershipLabel({ vip_status: 'active' }, 'en'), 'Active');
  assert.equal(membershipLabel({ vipStatus: 'expired' }, 'en'), 'Expired');
  assert.equal(membershipLabel({ vip_status: 'active' }, 'zh'), '会员有效');
});

test('missing, failed and unrecognized membership never claim expiry or access', () => {
  for (const usage of [
    null,
    undefined,
    {},
    { vip_status: '' },
    { vip_status: 'premium' },
  ]) {
    assert.equal(
      membershipLabel(usage, 'en'),
      'Unable to confirm — refresh later'
    );
  }
});

test('canonical backend field takes precedence over legacy camelCase', () => {
  assert.equal(
    membershipLabel({ vip_status: 'expired', vipStatus: 'active' }, 'en'),
    'Expired'
  );
});
