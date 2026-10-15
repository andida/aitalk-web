import assert from 'node:assert/strict';
import test from 'node:test';

import type { ConversationMode, UserLessonProgress } from '../types';
import { resolveTutorMode, saveTutorCompletion } from './tutor-completion';

test('persisted completion overrides client attempts to select guided mode', () => {
  assert.equal(resolveTutorMode('guided', true), 'review');
  assert.equal(resolveTutorMode(undefined, true), 'review');
  assert.equal(
    resolveTutorMode('completed_lesson_free', true),
    'completed_lesson_free'
  );
  assert.equal(resolveTutorMode('topic_free', false), 'topic_free');
  assert.equal(resolveTutorMode('guided', false), 'guided');
});

const passed = { task_passed: true, should_complete_lesson: true, score: 91 };
const input = {
  mode: 'guided' as ConversationMode,
  autoSend: false,
  raw: passed,
  criteria: ['Introduce yourself'],
};
function fixture() {
  const calls: string[] = [];
  let progress: UserLessonProgress | null = null;
  return {
    calls,
    source: {
      getProgress: async () => {
        calls.push('read');
        return progress;
      },
      saveReport: async () => {
        calls.push('report');
      },
      complete: async () => {
        calls.push('complete');
        progress = { user_id: 'test', lesson_id: 1, status: 'completed' };
      },
    },
  };
}

test('review and both free modes cannot save even if tutor returns completion flags', async () => {
  for (const mode of [
    'review',
    'topic_free',
    'completed_lesson_free',
  ] as const) {
    const { calls, source } = fixture();
    assert.equal(await saveTutorCompletion({ ...input, mode }, source), null);
    assert.deepEqual(calls, []);
  }
});
test('auto greeting never completes a lesson', async () => {
  const { calls, source } = fixture();
  assert.equal(
    await saveTutorCompletion({ ...input, autoSend: true }, source),
    null
  );
  assert.deepEqual(calls, []);
});
test('both tutor completion flags are required', async () => {
  for (const raw of [
    { task_passed: true, score: 90 },
    { should_complete_lesson: true, score: 90 },
    { task_passed: false, should_complete_lesson: true, score: 90 },
  ]) {
    const { calls, source } = fixture();
    assert.equal(await saveTutorCompletion({ ...input, raw }, source), null);
    assert.deepEqual(calls, []);
  }
});
test('missing and malformed scores never fabricate a passing mark', async () => {
  for (const score of [undefined, null, '', '91oops', NaN, Infinity]) {
    const { calls, source } = fixture();
    assert.equal(
      await saveTutorCompletion(
        { ...input, raw: { ...passed, score } },
        source
      ),
      null
    );
    assert.deepEqual(calls, []);
  }
});
test('successful server completion returns the saved report and skips sequential duplicates', async () => {
  const { calls, source } = fixture();
  const report = await saveTutorCompletion(input, source);
  assert.equal(report?.score, 91);
  assert.equal(report?.criteria_status[0].label, 'Introduce yourself');
  assert.deepEqual(calls, ['read', 'report', 'complete']);
  assert.equal(await saveTutorCompletion(input, source), null);
  assert.deepEqual(calls, ['read', 'report', 'complete', 'read']);
});
test('progress read failure does not save a report or mark complete', async () => {
  const { calls, source } = fixture();
  source.getProgress = async () => {
    throw new Error('read failed');
  };
  await assert.rejects(saveTutorCompletion(input, source), /read failed/);
  assert.deepEqual(calls, []);
});
test('report save failure does not mark complete', async () => {
  const { calls, source } = fixture();
  source.saveReport = async () => {
    throw new Error('report failed');
  };
  await assert.rejects(saveTutorCompletion(input, source), /report failed/);
  assert.deepEqual(calls, ['read']);
});
test('completion save failure is reported instead of returning false success', async () => {
  const { calls, source } = fixture();
  source.complete = async () => {
    throw new Error('completion failed');
  };
  await assert.rejects(saveTutorCompletion(input, source), /completion failed/);
  assert.deepEqual(calls, ['read', 'report']);
});
