import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Particles } from './particles';

test('particles render a decorative canvas on the server', () => {
  const html = renderToStaticMarkup(<Particles quantity={3} />);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /<canvas/);
});
