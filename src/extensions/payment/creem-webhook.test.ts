import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

import { CreemProvider } from './creem';
import { PaymentEventType, PaymentStatus } from './types';

const fixtureSecret = 'fixture-not-a-real-secret';
const provider = () => new CreemProvider({ apiKey: 'fixture', signingSecret: fixtureSecret });

function signedRequest(value: unknown, secret = fixtureSecret): Request {
  const body = JSON.stringify(value);
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  return new Request('https://local.invalid/webhook', {
    method: 'POST', body, headers: { 'creem-signature': signature },
  });
}

test('valid signed Creem checkout retains payment and raw event data', async () => {
  const payload = {
    eventType: 'checkout.completed',
    object: {
      order: { id: 'order', status: 'paid', amount: 100, amount_paid: 100, currency: 'usd' },
      metadata: { order_no: 'fixture-order' },
    },
    extra: 'preserved',
  };
  const event = await provider().getPaymentEvent({ req: signedRequest(payload) });
  assert.equal(event.eventType, PaymentEventType.CHECKOUT_SUCCESS);
  assert.equal(event.paymentSession?.paymentStatus, PaymentStatus.SUCCESS);
  assert.deepEqual(event.paymentSession?.metadata, payload.object.metadata);
  assert.deepEqual(event.eventResult, payload);
});

test('signed invalid event shapes fail before normalization', async () => {
  for (const value of [null, [], 'text', {}, { eventType: 1, object: {} },
    { eventType: 'checkout.completed', object: null },
    { eventType: 'checkout.completed', object: [] }]) {
    await assert.rejects(provider().getPaymentEvent({ req: signedRequest(value) }), /Invalid webhook/);
  }
});

test('incorrect signature rejects a structurally valid event', async () => {
  const payload = { eventType: 'checkout.completed', object: {} };
  await assert.rejects(provider().getPaymentEvent({ req: signedRequest(payload, 'incorrect') }), /Invalid webhook signature/);
});
