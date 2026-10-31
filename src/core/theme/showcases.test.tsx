import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';

import { Showcases } from '@/themes/default/blocks/showcases';

test('showcase renders group selection and empty state', () => {
  const section = {
    title: 'Examples',
    groups: [{ name: 'all', title: 'All examples' }],
    items: [],
  };
  const html = renderToStaticMarkup(<Showcases section={section} />);
  assert.match(html, /Examples/);
  assert.match(html, /All examples/);
  assert.match(html, /No items found/);
});

test('showcase renders typed item button without wrapping it in another link', () => {
  const section = {
    groups: [{ name: 'all', title: 'All examples' }],
    items: [
      {
        title: 'Example',
        image: { src: '/example.png' },
        button: { title: 'Open example', url: '/example' },
      },
    ],
  };
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={{}}>
      <Showcases section={section} />
    </NextIntlClientProvider>
  );
  assert.match(html, /Open example/);
  assert.match(html, /href="\/example"/);
  assert.equal((html.match(/<a\s/g) || []).length, 1);
});
