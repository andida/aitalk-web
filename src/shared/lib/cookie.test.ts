import assert from 'node:assert/strict';
import test from 'node:test';

import { getCookieFromCtx, getHeaderValue } from './cookie';

test('reads cookies from context helper and both supported header shapes', () => {
  assert.equal(
    getCookieFromCtx({ getCookie: () => 'zh' }, 'NEXT_LOCALE'),
    'zh'
  );
  assert.equal(
    getCookieFromCtx(
      { headers: new Headers({ cookie: 'a=1; NEXT_LOCALE=en' }) },
      'NEXT_LOCALE'
    ),
    'en'
  );
  assert.equal(
    getHeaderValue(
      { request: { headers: { 'accept-language': 'zh-CN' } } },
      'Accept-Language'
    ),
    'zh-CN'
  );
});

test('returns undefined for absent or non-string values', () => {
  assert.equal(getCookieFromCtx(null, 'missing'), undefined);
  assert.equal(
    getHeaderValue({ headers: { cookie: 123 } }, 'cookie'),
    undefined
  );
  assert.equal(
    getCookieFromCtx({ getCookie: () => 123 }, 'missing'),
    undefined
  );
});
