import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { useHydrated } from './use-hydrated';

function HydrationProbe() {
  return <span>{useHydrated() ? 'client' : 'server'}</span>;
}

test('hydration hook renders a stable server placeholder', () => {
  assert.equal(renderToStaticMarkup(<HydrationProbe />), '<span>server</span>');
});
