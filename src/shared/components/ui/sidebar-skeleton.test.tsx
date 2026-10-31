import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SidebarMenuSkeleton } from './sidebar';

test('sidebar skeleton widths are deterministic during server rendering', () => {
  const render = () => renderToStaticMarkup(<SidebarMenuSkeleton />);
  const html = render();
  assert.equal(html, render());
  const match = html.match(/--skeleton-width:(\d+)%/);
  assert.ok(match);
  assert.ok(Number(match[1]) >= 50 && Number(match[1]) < 90);
});
