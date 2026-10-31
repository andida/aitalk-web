import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PayPalProvider } from './paypal';
import { PaymentInterval, PaymentType } from './types';

const cases: [string, unknown, string | undefined][] = [
  ['normal', [{ rel: 'approve', href: 'https://paypal.invalid/approve' }], 'https://paypal.invalid/approve'],
  ['malformed entries', [null, 5, { rel: 'approve', href: 5 }, { rel: 'approve', href: 'https://paypal.invalid/valid' }], 'https://paypal.invalid/valid'],
  ['wrong container', { rel: 'approve', href: 'https://paypal.invalid/approve' }, undefined],
];

for (const type of [PaymentType.ONE_TIME, PaymentType.SUBSCRIPTION]) {
  for (const [name, links, expected] of cases) {
    test(`${type} approval link: ${name}`, async () => {
      const provider = new PayPalProvider({ clientId: 'fixture', clientSecret: 'fixture' });
      // Stub every provider request; no PayPal or network access occurs.
      Object.assign(provider, {
        ensureAccessToken: async () => {},
        makeRequest: async () => ({ id: 'fixture-id', links }),
      });
      const result = await provider.createPayment({ order: {
        type, price: { amount: 100, currency: 'USD' },
        plan: { name: 'fixture', interval: PaymentInterval.MONTH },
      } });
      assert.equal(result.checkoutInfo.checkoutUrl, expected);
    });
  }
}
