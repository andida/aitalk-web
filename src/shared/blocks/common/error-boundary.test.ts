import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ErrorBoundary } from './error-boundary';

test('error boundary handles Next not-found and arbitrary thrown values', () => {
  assert.deepEqual(
    ErrorBoundary.getDerivedStateFromError({ digest: 'NEXT_NOT_FOUND' }),
    { hasError: false }
  );
  for (const error of [
    null,
    undefined,
    'failure',
    new Error('failure'),
    { digest: 'OTHER' },
  ]) {
    assert.deepEqual(ErrorBoundary.getDerivedStateFromError(error), {
      hasError: true,
    });
  }
});
