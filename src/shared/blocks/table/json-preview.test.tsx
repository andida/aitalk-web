import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { JsonPreview } from './json-preview';

test('valid JSON is pretty-printed inside a pre element', () => {
  const html = renderToStaticMarkup(<JsonPreview value={'{"level":1}'} />);
  assert.match(html, /^<pre>/);
  assert.match(html, /&quot;level&quot;: 1/);
});

test('invalid JSON is displayed unchanged', () => {
  const html = renderToStaticMarkup(<JsonPreview value="not-json" />);
  assert.equal(html, '<div>not-json</div>');
});

test('empty JSON input retains the placeholder', () => {
  const html = renderToStaticMarkup(
    <JsonPreview value="" placeholder="No content" />
  );
  assert.equal(html, '<div>No content</div>');
});
