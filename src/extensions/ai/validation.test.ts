import assert from 'node:assert/strict';
import test from 'node:test';

import { isRecord, optionalString, readOptions, requireRecord, requiredString, stringArray } from './validation';

test('provider objects reject null, primitives, and arrays', () => {
  assert.equal(isRecord({ output: 1 }), true);
  for (const value of [null, 0, 'text', []]) assert.equal(isRecord(value), false);
  assert.deepEqual(readOptions(null), {});
  assert.throws(() => readOptions([]), /expected an object/);
});

test('provider strings reject invalid values and sparse arrays', () => {
  assert.equal(requiredString('', 'bad string'), '');
  assert.throws(() => requiredString(0, 'bad string'), /bad string/);
  assert.deepEqual(stringArray(['a', 'b'], 'bad array'), ['a', 'b']);
  assert.throws(() => stringArray(['a', null], 'bad array'), /bad array/);
  assert.throws(() => stringArray(Array(1), 'bad array'), /bad array/);
});

test('media URLs preserve null and missing values but reject malformed values', () => {
  assert.equal(optionalString(null, 'invalid URL'), null);
  assert.equal(optionalString(undefined, 'invalid URL'), undefined);
  assert.equal(optionalString('https://example.invalid/image.png', 'invalid URL'), 'https://example.invalid/image.png');
  assert.throws(() => optionalString(42, 'invalid URL'), /invalid URL/);
  assert.throws(() => requireRecord(null, 'invalid media'), /invalid media/);
});
