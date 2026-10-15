import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';

import { FreeTalkTopicSelector } from './free-talk-topic-selector';

for (const locale of ['en', 'zh']) {
  test(`topic selector has a locale-aware course exit (${locale})`, () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} timeZone="UTC" messages={{}}>
        <FreeTalkTopicSelector invalidTopicKey />
      </NextIntlClientProvider>
    );
    const href = locale === 'en' ? '/lessons' : '/zh/lessons';
    assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes('Back to lessons'));
    assert.ok(
      html.indexOf('Back to lessons') < html.indexOf('What would you like')
    );
    assert.equal((html.match(/topicKey=/g) || []).length, 8);
    assert.ok(html.includes('role="alert"'));
  });
}
