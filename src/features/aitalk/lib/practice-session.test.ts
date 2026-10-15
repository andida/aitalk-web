import assert from 'node:assert/strict';
import test from 'node:test';

import type { ActiveLearningPlan, UserLessonProgress } from '../types';
import { loadCoursePractice } from './practice-session';

function fixture(status: string | null) {
  const calls: string[] = [];
  const lesson = { id: 7, title: 'Greetings' };
  const progress: UserLessonProgress | null = status
    ? { user_id: 'test-user', lesson_id: 7, status }
    : null;
  const plan: ActiveLearningPlan = {
    plan: null,
    lesson,
    progress,
    items: [],
    lessonI18n: null,
  };
  const source = {
    getActivePlan: async () => {
      calls.push('plan');
      return plan;
    },
    getLesson: async () => {
      calls.push('lesson');
      return lesson;
    },
    getProgress: async () => {
      calls.push('progress');
      return progress;
    },
    getSteps: async () => {
      calls.push('steps');
      return [];
    },
  };
  return { calls, source };
}

test('explicit completed lessons enter review without loading a mutable plan', async () => {
  const { calls, source } = fixture('completed');
  const result = await loadCoursePractice(7, undefined, source);
  assert.equal(result?.practiceMode, 'review');
  assert.equal(result?.activePlan, null);
  assert.deepEqual(calls, ['lesson', 'progress', 'steps']);
});

test('completed-lesson free talk has no writable plan', async () => {
  const { calls, source } = fixture('completed');
  const result = await loadCoursePractice(7, 'free', source);
  assert.equal(result?.practiceMode, 'completed_lesson_free');
  assert.equal(result?.activePlan, null);
  assert.ok(!calls.includes('plan'));
});

test('progress failure aborts before plan initialization or mode selection', async () => {
  const { calls, source } = fixture('completed');
  const failure = new Error('progress unavailable');
  source.getProgress = async () => {
    throw failure;
  };
  await assert.rejects(loadCoursePractice(7, undefined, source), failure);
  assert.ok(!calls.includes('plan'));
});

test('step failure cannot produce a practice session with invented criteria', async () => {
  const { calls, source } = fixture('in_progress');
  const failure = new Error('steps unavailable');
  source.getSteps = async () => {
    throw failure;
  };
  await assert.rejects(loadCoursePractice(7, undefined, source), failure);
  assert.ok(!calls.includes('plan'));
});

test('unfinished and new lessons use guided mode after successful reads', async () => {
  for (const status of ['in_progress', null]) {
    const { calls, source } = fixture(status);
    const result = await loadCoursePractice(7, 'free', source);
    assert.equal(result?.practiceMode, 'guided');
    assert.ok(result?.activePlan);
    assert.deepEqual(calls, ['lesson', 'progress', 'steps', 'plan']);
  }
});

test('default practice loads the current lesson once', async () => {
  const { calls, source } = fixture('in_progress');
  const result = await loadCoursePractice(null, undefined, source);
  assert.equal(result?.lesson.id, 7);
  assert.deepEqual(calls, ['plan', 'progress', 'steps']);
});

test('missing requested lesson does not fall back to another course', async () => {
  const { calls, source } = fixture(null);
  const result = await loadCoursePractice(999, undefined, {
    ...source,
    getLesson: async () => null,
  });
  assert.equal(result, null);
  assert.deepEqual(calls, []);
});
