import assert from 'node:assert/strict';
import test from 'node:test';

import type { UserLearningPlanItem } from '../types';
import {
  buildMissingPlanItems,
  chooseCurrentLessonId,
  filterPlanItemsForLessons,
  getNextSegmentLessonId,
  groupPlanItemsByUnit,
  levelPlanOrder,
  normalizeLearningLevel,
} from './course-plan';

function planItem(
  lessonId: number,
  planOrder: number,
  status = 'not_started'
): UserLearningPlanItem {
  return {
    id: lessonId,
    plan_id: 1,
    user_id: 'test-user',
    lesson_id: lessonId,
    plan_order: planOrder,
    status,
  };
}

test('learning levels and orders stay inside L1-L5 segments', () => {
  assert.equal(normalizeLearningLevel('L0'), 1);
  assert.equal(normalizeLearningLevel('9'), 5);
  assert.equal(levelPlanOrder(1, 1), 1001);
  assert.equal(levelPlanOrder(5, 20), 5020);
  assert.equal(levelPlanOrder(2, 2101), 2101);
  assert.equal(levelPlanOrder(5, 5405), 5405);
});

test('missing items are idempotent and never active by default', () => {
  const lessons = [
    { id: 2, level_id: 2, sort_order: 2 },
    { id: 3, level_id: 2, sort_order: 3 },
  ];
  const missing = buildMissingPlanItems([{ lesson_id: 2 }], lessons, 2);

  assert.deepEqual(missing, [
    { lesson_id: 3, plan_order: 2003, status: 'not_started' },
  ]);
  assert.deepEqual(
    buildMissingPlanItems([{ lesson_id: 2 }, { lesson_id: 3 }], lessons, 2),
    []
  );
});

test('recommended lesson ids define the visible active path', () => {
  const items = [planItem(9, 1009), planItem(10, 2010)];
  assert.deepEqual(filterPlanItemsForLessons(items, [{ id: 10 }]), [items[1]]);
});

test('current and next lesson selection never crosses level segments', () => {
  const items = [
    planItem(1, 1001, 'completed'),
    planItem(2, 1002),
    planItem(3, 2001),
  ];

  assert.equal(chooseCurrentLessonId(items, 3), 3);
  assert.equal(chooseCurrentLessonId(items, 1), 2);
  assert.equal(chooseCurrentLessonId(items, 99), 2);
  assert.equal(getNextSegmentLessonId(items, 1), 2);
  assert.equal(getNextSegmentLessonId(items, 2), null);
});

test('course items group by unit while preserving plan order', () => {
  const groups = groupPlanItemsByUnit([
    {
      ...planItem(2, 1002),
      lesson_list_detail: { id: 2, unit_id: 1, unit_name: 'First steps' },
    },
    {
      ...planItem(1, 1001),
      lesson_list_detail: { id: 1, unit_id: 1, unit_name: 'First steps' },
    },
    {
      ...planItem(3, 1003),
      lesson_list_detail: { id: 3, unit_id: 2, unit_name: 'Out and about' },
    },
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].name, 'First steps');
  assert.deepEqual(
    groups[0].items.map((item) => item.lesson_id),
    [1, 2]
  );
});
