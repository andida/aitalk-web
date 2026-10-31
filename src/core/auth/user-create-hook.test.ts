import assert from 'node:assert/strict';
import test from 'node:test';
import { getWithHooks } from 'better-auth/db';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';

import { enrichNewUser } from './user-create-hook';

const dependencies = {
  getClientIp: async () => '192.0.2.10',
  getLocale: async () => 'en',
};

test('enrichment prioritizes locale cookie, sanitizes attribution, and returns data', async () => {
  const user: Record<string, unknown> = { id: 'test-user', email: 'test@example.invalid' };
  const result = await enrichNewUser(user, {
    headers: new Headers({
      cookie: 'NEXT_LOCALE=zh; utm_source=hello%20%3Ctest%3E',
      'accept-language': 'en-US,en;q=0.8',
    }),
  }, dependencies);
  assert.equal(result.data, user);
  assert.deepEqual(user, {
    id: 'test-user', email: 'test@example.invalid', ip: '192.0.2.10',
    locale: 'zh', utmSource: 'hellotest',
  });
});

test('header and fallback locale work and existing attribution is retained', async () => {
  const user: Record<string, unknown> = { utmSource: 'existing' };
  await enrichNewUser(user, { headers: new Headers({ 'accept-language': 'fr-CA' }) }, dependencies);
  assert.equal(user.locale, 'fr');
  assert.equal(user.utmSource, 'existing');
  const noHeaders: Record<string, unknown> = {};
  await enrichNewUser(noHeaders, null, dependencies);
  assert.equal(noHeaders.locale, 'en');
});

test('malformed attribution and unavailable IP remain best effort', async () => {
  const malformed: Record<string, unknown> = {};
  const value = await enrichNewUser(malformed, { headers: new Headers({ cookie: 'utm_source=%ZZ' }) }, dependencies);
  assert.equal(value.data, malformed);
  assert.equal(malformed.locale, 'en');
  assert.equal(malformed.utmSource, undefined);
  const unavailable: Record<string, unknown> = {};
  await enrichNewUser(unavailable, null, { ...dependencies, getClientIp: async () => { throw new Error('unavailable'); } });
  assert.deepEqual(unavailable, {});
});

test('locale and attribution retain their existing length limits', async () => {
  const user: Record<string, unknown> = {};
  const cookie = `NEXT_LOCALE=${'z'.repeat(40)}; utm_source=${'a'.repeat(150)}`;
  await enrichNewUser(user, { headers: new Headers({ cookie }) }, dependencies);
  assert.equal(user.locale, 'z'.repeat(20));
  assert.equal(user.utmSource, 'a'.repeat(100));
});

test('locked Better Auth hook pipeline receives enriched data without a database', async () => {
  let written: Record<string, unknown> | undefined;
  const adapter = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      written = data;
      return data;
    },
  } as unknown as Parameters<typeof getWithHooks>[0];
  const date = new Date('2026-01-01T00:00:00Z');
  const user = { id: 'test-user', email: 'test@example.invalid', name: 'Test', emailVerified: false, createdAt: date, updatedAt: date };
  const hooks = getWithHooks(adapter, {
    options: {},
    hooks: [{ user: { create: { before: async (value, context) => enrichNewUser(value, context, dependencies) } } }],
  });
  const created = await hooks.createWithHooks(user, 'user');
  assert.equal(created.id, 'test-user');
  assert.equal(written?.ip, '192.0.2.10');
  assert.equal(written?.locale, 'en');
});

test('Better Auth email signup persists enriched fields in an in-memory adapter', async () => {
  const store: Record<string, Record<string, unknown>[]> = {
    user: [], session: [], account: [], verification: [],
  };
  const auth = betterAuth({
    secret: 'local-test-secret-with-at-least-32-characters',
    baseURL: 'http://localhost:3000',
    database: memoryAdapter(store),
    emailAndPassword: { enabled: true },
    user: { additionalFields: {
      ip: { type: 'string', required: false, input: false },
      locale: { type: 'string', required: false, input: false },
      utmSource: { type: 'string', required: false, input: false },
    } },
    databaseHooks: { user: { create: {
      before: async (user, context) => enrichNewUser(user, context, dependencies),
    } } },
  });
  await auth.api.signUpEmail({
    body: { name: 'Test', email: 'test@example.invalid', password: 'test-password-123' },
    headers: new Headers({ cookie: 'NEXT_LOCALE=zh; utm_source=lesson%3Atest' }),
  });
  assert.equal(store.user.length, 1);
  assert.equal(store.user[0].email, 'test@example.invalid');
  assert.equal(store.user[0].ip, '192.0.2.10');
  assert.equal(store.user[0].locale, 'zh');
  assert.equal(store.user[0].utmSource, 'lesson:test');
});
