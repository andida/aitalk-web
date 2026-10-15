import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completeLessonProgress,
  getCourseTranslations,
  startLessonProgress,
} from '../data';

type Client = Parameters<typeof startLessonProgress>[0];

// A deliberately offline Supabase contract double. No network or user data.
function clientDouble(rows: unknown[], error: Error | null = null) {
  const writes: Record<string, unknown>[] = [];
  const reads: string[] = [];
  const filters: unknown[][] = [];
  const query = {
    select: () => query,
    eq: (...args: unknown[]) => {
      filters.push(['eq', ...args]);
      return query;
    },
    in: (...args: unknown[]) => {
      filters.push(['in', ...args]);
      return query;
    },
    limit: async () => ({ data: rows, error }),
    upsert: (payload: Record<string, unknown>) => {
      writes.push(payload);
      return query;
    },
    then: (
      resolve: (value: { data: unknown[]; error: Error | null }) => unknown
    ) => Promise.resolve({ data: rows, error }).then(resolve),
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'test-user' } },
        error: null,
      }),
    },
    from: (table: string) => {
      reads.push(table);
      return query;
    },
  } as unknown as Client;
  return { client, writes, reads, filters };
}

test('progress read errors stop writes rather than reset completed progress', async () => {
  const failure = new Error('database unavailable');
  const { client, writes } = clientDouble([], failure);
  await assert.rejects(startLessonProgress(client, 1), failure);
  assert.equal(writes.length, 0);
});

test('completion progress read failure does not overwrite counters or best score', async () => {
  const failure = new Error('database unavailable');
  const { client, writes } = clientDouble([], failure);
  await assert.rejects(
    completeLessonProgress(client, 1, undefined, {
      score: 80,
      countAttempt: true,
    }),
    failure
  );
  assert.deepEqual(writes, []);
});

test('starting a completed lesson preserves completion and original start', async () => {
  const { client, writes } = clientDouble([
    { status: 'completed', progress_percent: 100, started_at: '2026-01-01' },
  ]);
  await startLessonProgress(client, 1);
  assert.equal(writes[0].status, 'completed');
  assert.equal(writes[0].progress_percent, 100);
  assert.equal(writes[0].started_at, '2026-01-01');
});

test('starting preserves advanced progress and initializes a new lesson', async () => {
  const existing = clientDouble([
    { status: 'in_progress', progress_percent: 65 },
  ]);
  await startLessonProgress(existing.client, 1);
  assert.equal(existing.writes[0].progress_percent, 65);
  const fresh = clientDouble([]);
  await startLessonProgress(fresh.client, 1);
  assert.equal(fresh.writes[0].status, 'in_progress');
  assert.equal(fresh.writes[0].progress_percent, 10);
});

test('translation loading skips queries without a native language', async () => {
  const { client, reads } = clientDouble([]);
  assert.deepEqual(await getCourseTranslations(client, [1], null), {});
  assert.equal(reads.length, 0);
});

test('translations batch only requested lessons in the native language', async () => {
  const row = { lesson_id: 7, title: '问候' };
  const { client, reads, filters } = clientDouble([row]);
  const result = await getCourseTranslations(client, [7, 8], {
    user_id: 'test-user',
    native_language: 'Chinese',
  });
  assert.deepEqual(result, { 7: row });
  assert.equal(result[8], undefined);
  assert.deepEqual(reads, ['course_lesson_i18n']);
  assert.deepEqual(filters, [
    ['in', 'lesson_id', [7, 8]],
    ['eq', 'native_language', 'Chinese'],
  ]);
});

test('translation errors propagate to the retry boundary', async () => {
  const failure = new Error('translation query failed');
  const { client } = clientDouble([], failure);
  await assert.rejects(
    getCourseTranslations(client, [7], {
      user_id: 'test-user',
      native_language_code: 'zh',
    }),
    failure
  );
});
