import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { imageSize } from './image-size';
import { Label } from './label';

test('label keeps supported variants and falls back for invalid metadata', () => {
  const supported = renderToStaticMarkup(
    <Label value="ok" metadata={{ variant: 'destructive' }} />
  );
  const fallback = renderToStaticMarkup(
    <Label value="ok" metadata={{ variant: {} }} />
  );
  assert.match(supported, /bg-destructive/);
  assert.match(fallback, /bg-secondary/);
});

test('image dimensions fall back for missing or invalid metadata', () => {
  assert.equal(imageSize('bad'), 40);
  assert.equal(imageSize(null), 40);
  assert.equal(imageSize(0), 40);
  assert.equal(imageSize(80), 80);
});
