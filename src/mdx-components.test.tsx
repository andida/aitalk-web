import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { withNoFollow } from './mdx-components';

const Link = withNoFollow((props) => <a {...props} />);

test('external MDX links retain safe target and rel attributes', () => {
  const html = renderToStaticMarkup(<Link href="https://example.com">Link</Link>);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="nofollow noopener noreferrer"/);
});

test('internal MDX links do not acquire external link attributes', () => {
  const html = renderToStaticMarkup(<Link href="/lessons">Lessons</Link>);
  assert.match(html, /href="\/lessons"/);
  assert.doesNotMatch(html, /target=|rel=/);
});
