import assert from 'node:assert/strict';
import test from 'node:test';

import { withAccessCheck } from './with-access-check';

test('authorization precedes the handler and preserves arguments and result', async () => {
  const calls: string[] = [];
  const guarded = withAccessCheck(
    async () => {
      calls.push('authorize');
    },
    (first: string, second: number) => {
      calls.push('handler');
      return `${first}:${second}`;
    }
  );
  assert.equal(await guarded('lesson', 2), 'lesson:2');
  assert.deepEqual(calls, ['authorize', 'handler']);
});

test('a denied check never executes the handler', async () => {
  let invoked = false;
  const denied = new Error('denied');
  const guarded = withAccessCheck(
    async () => {
      throw denied;
    },
    () => {
      invoked = true;
    }
  );
  await assert.rejects(guarded(), (error) => error === denied);
  assert.equal(invoked, false);
});

test('async handler results and failures propagate', async () => {
  const failure = new Error('handler failure');
  assert.equal(
    await withAccessCheck(
      async () => {},
      async () => 42
    )(),
    42
  );
  await assert.rejects(
    withAccessCheck(
      async () => {},
      async () => {
        throw failure;
      }
    )(),
    (error) => error === failure
  );
});
