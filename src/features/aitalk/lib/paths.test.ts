import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getLocaleFromPath,
  normalizeAitalkRedirect,
  stripLocale,
  withLocale,
} from './paths';

test('locale paths preserve query and fragment while switching locale', () => {
  assert.equal(
    stripLocale('/zh/lessons/3?mode=review#top'),
    '/lessons/3?mode=review#top'
  );
  assert.equal(withLocale('/en/lessons?x=1', 'zh'), '/zh/lessons?x=1');
  assert.equal(getLocaleFromPath('/zh/lessons'), 'zh');
});

test('redirect rejects external and auth-loop destinations', () => {
  assert.equal(normalizeAitalkRedirect('https://example.com'), '/app');
  assert.equal(normalizeAitalkRedirect('//example.com'), '/app');
  assert.equal(normalizeAitalkRedirect('/zh/auth/callback'), '/app');
  assert.equal(normalizeAitalkRedirect('/zh/lessons?tab=1'), '/lessons?tab=1');
});
