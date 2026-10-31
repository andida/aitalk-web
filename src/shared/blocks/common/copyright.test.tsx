import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Copyright } from './copyright';

test('server rendering uses the stable hydration year and supplied brand', () => {
  const html = renderToStaticMarkup(
    <Copyright brand={{ title: 'AITalk', url: '/lessons' }} />
  );
  assert.match(html, /2024/);
  assert.match(html, /href="\/lessons"/);
  assert.match(html, />AITalk<\/a>/);
});
