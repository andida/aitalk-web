// Offline visual fixture only. Not a Next route, auth bypass, or E2E server.
// Run after a build: pnpm exec tsx scripts/aitalk-lessons-preview.tsx
/* eslint-disable @next/next/no-html-link-for-pages -- Static HTTP fixture, not a Next app; navigation requires normal document links. */
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';

import type { UserLearningPlanItem } from '../src/features/aitalk/types';
import { FreeTalkTopicSelector } from '../src/features/aitalk/ui/free-talk-topic-selector';
import {
  LessonHero,
  LessonPath,
} from '../src/features/aitalk/ui/lesson-components';

const staticRoot = path.join(process.cwd(), '.next/static');
const assets = new Map(
  readdirSync(staticRoot, { recursive: true })
    .map(String)
    .filter((file) => /\.(css|woff2?)$/.test(file))
    .map((file) => [`/_next/static/${file}`, path.join(staticRoot, file)])
);
const styles = [...assets.keys()].filter((file) => file.endsWith('.css'));
const items: UserLearningPlanItem[] = [
  'completed',
  'in_progress',
  'not_started',
].map((status, index) => ({
  id: index + 1,
  plan_id: 1,
  user_id: 'offline-fixture',
  lesson_id: index + 1,
  plan_order: 1001 + index,
  status,
  lesson_list_detail: {
    id: index + 1,
    title:
      index === 1
        ? 'Discussing everyday experiences and plans with a new friend'
        : 'Greetings and introductions',
    subtitle: 'Practice a clear, friendly conversation at your own pace.',
    unit_id: 1,
    unit_name: 'Everyday conversation',
    level_id: 1,
    duration_minutes: 10,
  },
}));

createServer((request, response) => {
  if (request.method !== 'GET') {
    response.writeHead(405).end();
    return;
  }
  const url = new URL(request.url || '/', 'http://127.0.0.1:3419');
  const asset = assets.get(url.pathname);
  if (asset) {
    response.setHeader(
      'Content-Type',
      asset.endsWith('.css') ? 'text/css' : 'font/woff2'
    );
    response.end(readFileSync(asset));
    return;
  }
  if (
    !['/', '/empty', '/completed', '/topics', '/lessons'].includes(url.pathname)
  ) {
    response.writeHead(404).end();
    return;
  }
  const completed = url.pathname === '/completed';
  const visibleItems =
    url.pathname === '/empty'
      ? []
      : completed
        ? items.map((item) => ({ ...item, status: 'completed' }))
        : items;
  const markup = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{}}>
      <main className="min-h-screen bg-[#f6fbf8] p-4 text-zinc-950 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <p>Offline visual fixture — synthetic data, actions disabled.</p>
          <nav className="flex gap-4">
            <a href="/">In progress</a>
            <a href="/empty">Empty</a>
            <a href="/completed">Completed</a>
            <a href="/topics">Topics</a>
          </nav>
          {url.pathname === '/topics' ? (
            <FreeTalkTopicSelector />
          ) : (
            <>
              {visibleItems.length > 0 ? (
                <LessonHero
                  locale="en"
                  lesson={items[1].lesson_list_detail!}
                  courseCompleted={completed}
                  progress={{
                    user_id: 'offline-fixture',
                    lesson_id: 2,
                    status: completed ? 'completed' : 'in_progress',
                    progress_percent: completed ? 100 : 35,
                  }}
                />
              ) : null}
              <LessonPath
                locale="en"
                items={visibleItems}
                currentLessonId={2}
              />
            </>
          )}
        </div>
      </main>
    </NextIntlClientProvider>
  );
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Prevent React's serialized action fallback scripts from running in this static fixture.
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; form-action 'none'"
  );
  response.end(
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>AITalk offline lesson fixture</title>${styles.map((file) => `<link rel="stylesheet" href="${file}">`).join('')}</head><body>${markup}</body></html>`
  );
}).listen(3419, '127.0.0.1', () =>
  console.log('Offline fixture: http://127.0.0.1:3419')
);
