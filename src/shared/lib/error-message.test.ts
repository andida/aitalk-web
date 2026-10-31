import assert from 'node:assert/strict';
import test from 'node:test';

import { errorMessage } from './error-message';

test('extracts messages from errors and error-shaped SDK responses', () => {
  assert.equal(errorMessage(new Error('network'), 'fallback'), 'network');
  assert.equal(errorMessage({ message: 'denied' }, 'fallback'), 'denied');
  assert.equal(errorMessage({ message: 42 }, 'fallback'), 'fallback');
  assert.equal(errorMessage(null, 'fallback'), 'fallback');
});
