import assert from 'node:assert/strict';
import test from 'node:test';

import { paymentOrderNumber } from './payment-metadata';

test('accepts only a nonempty own string order number', () => {
  assert.equal(paymentOrderNumber({ order_no: 'ORDER-1' }), 'ORDER-1');
  assert.equal(paymentOrderNumber(Object.assign(Object.create(null), { order_no: 'x' })), 'x');
  for (const value of [null, undefined, '', 123, [], {}, { order_no: 1 }, { order_no: '' }, Object.create({ order_no: 'inherited' })]) {
    assert.equal(paymentOrderNumber(value), undefined);
  }
});

test('rejects metadata whose property cannot be inspected', () => {
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  assert.equal(paymentOrderNumber(revoked.proxy), undefined);
  const throwing = Object.defineProperty({}, 'order_no', { get() { throw new Error('unavailable'); } });
  assert.equal(paymentOrderNumber(throwing), undefined);
});
