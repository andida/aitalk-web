import assert from 'node:assert/strict';
import test from 'node:test';

import type { ConversationMode, TutorPracticeReport } from '../types';
import { chooseOwnedActivePlanId } from './course-plan';
import {
  isTutorPracticeReport,
  readTutorCompletionScore,
  resolveTutorMode,
  saveTutorCompletion,
} from './tutor-completion';

test('owned plan fallback ignores untrusted IDs and matches language and level', () => {
  const plans = [
    { id: 33, language: 'English', level: '5' },
    { id: 22, language: ' English ', level: 'L1' },
    { id: 11, language: 'Spanish', level: '1' },
  ];
  assert.equal(chooseOwnedActivePlanId(plans, 22, 'english', 1), 22);
  assert.equal(chooseOwnedActivePlanId(plans, 999, 'ENGLISH', 'L1'), 22);
  assert.equal(chooseOwnedActivePlanId(plans, 33, 'English', 1), 22);
  assert.equal(chooseOwnedActivePlanId(plans, undefined, 'English', 5), 33);
  assert.equal(chooseOwnedActivePlanId(plans, undefined, 'Spanish', 1), 11);
  assert.equal(chooseOwnedActivePlanId(plans, undefined, 'Japanese', 1), null);
  assert.equal(
    chooseOwnedActivePlanId(
      [{ id: 44, language: 'English', level: null }],
      undefined,
      'English',
      1
    ),
    null
  );
});

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
  let saved: TutorPracticeReport | null = null;
  return {
    calls,
    source: {
      commit: async (
        report: TutorPracticeReport
      ): Promise<TutorPracticeReport | null> => {
        calls.push('commit');
        saved ??= report;
        return saved;
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
test('out-of-range and fractional tutor scores never reach the commit', async () => {
  for (const score of [-1, 101, 2.5, '2.5']) {
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
  assert.equal(readTutorCompletionScore({ score: 0 }), 0);
  assert.equal(readTutorCompletionScore({ score: '100' }), 100);
});
test('trusted report validation rejects malformed persisted shapes', () => {
  const valid = {
    score: 91,
    criteria_status: [
      { label: 'Introduce yourself', status: 'met', evidence: null },
    ],
    target_chunks_used: [],
    feedback_summary: 'Good work',
    weak_points: [],
    review_items: [],
    improved_sentence: null,
  };
  assert.equal(isTutorPracticeReport(valid), true);
  assert.equal(
    isTutorPracticeReport({ ...valid, criteria_status: 'not-an-array' }),
    false
  );
  assert.equal(isTutorPracticeReport({ ...valid, weak_points: [1] }), false);
  assert.equal(
    isTutorPracticeReport({ ...valid, feedback_summary: null }),
    false
  );
  assert.equal(
    isTutorPracticeReport({
      ...valid,
      improved_sentence: { improved: '   ' },
    }),
    false
  );
  assert.equal(isTutorPracticeReport({ ...valid, score: 91.5 }), false);
});
test('completion uses one commit and returns the canonical saved report on retry', async () => {
  const { calls, source } = fixture();
  const report = await saveTutorCompletion(input, source);
  assert.equal(report?.score, 91);
  assert.equal(report?.criteria_status[0].label, 'Introduce yourself');
  assert.deepEqual(calls, ['commit']);
  assert.equal(await saveTutorCompletion(input, source), report);
  assert.deepEqual(calls, ['commit', 'commit']);
});
test('legacy completed lessons can return no new report', async () => {
  const { calls, source } = fixture();
  source.commit = async () => null;
  assert.equal(await saveTutorCompletion(input, source), null);
  assert.deepEqual(calls, []);
});
test('atomic commit failure propagates without partial-write fallback', async () => {
  const { calls, source } = fixture();
  source.commit = async () => {
    throw new Error('transaction failed');
  };
  await assert.rejects(
    saveTutorCompletion(input, source),
    /transaction failed/
  );
  assert.deepEqual(calls, []);
});
