import type { LessonListDetail, UserLearningPlanItem } from '../types';

export const PLAN_LEVEL_SEGMENT = 1000;

export function normalizeLearningLevel(value?: number | string | null) {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value ?? '').replace(/^L/i, ''), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(5, Math.max(1, Math.trunc(parsed)));
}

export function levelPlanOrder(
  level: number | string | null | undefined,
  lessonOrder: number
) {
  const rawOrder = Number.isFinite(lessonOrder)
    ? Math.abs(Math.trunc(lessonOrder))
    : 1;
  const orderWithinLevel = rawOrder % PLAN_LEVEL_SEGMENT;
  const normalizedOrder = Math.max(1, orderWithinLevel);
  return normalizeLearningLevel(level) * PLAN_LEVEL_SEGMENT + normalizedOrder;
}

export function buildMissingPlanItems(
  existing: Pick<UserLearningPlanItem, 'lesson_id'>[],
  lessons: LessonListDetail[],
  fallbackLevel?: number | string | null
) {
  const existingIds = new Set(existing.map((item) => item.lesson_id));

  return lessons
    .filter((lesson) => !existingIds.has(lesson.id))
    .map((lesson, index) => ({
      lesson_id: lesson.id,
      plan_order: levelPlanOrder(
        lesson.level_id ?? lesson.levelId ?? fallbackLevel,
        lesson.sort_order ?? lesson.sortOrder ?? index + 1
      ),
      status: 'not_started' as const,
    }));
}

export function filterPlanItemsForLessons(
  items: UserLearningPlanItem[],
  lessons: Pick<LessonListDetail, 'id'>[]
) {
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  return items.filter((item) => lessonIds.has(item.lesson_id));
}

export function chooseCurrentLessonId(
  items: UserLearningPlanItem[],
  preferredLessonId?: number | null
) {
  const ordered = [...items].sort((a, b) => a.plan_order - b.plan_order);
  const preferred = ordered.find(
    (item) => item.lesson_id === preferredLessonId
  );
  if (preferred && preferred.status !== 'completed') {
    return preferredLessonId;
  }
  return (
    ordered.find((item) => item.status !== 'completed')?.lesson_id ??
    preferred?.lesson_id ??
    ordered[0]?.lesson_id ??
    null
  );
}

export function getNextSegmentLessonId(
  items: UserLearningPlanItem[],
  lessonId: number
) {
  const current = items.find((item) => item.lesson_id === lessonId);
  if (!current) return null;

  const segment = Math.floor(current.plan_order / PLAN_LEVEL_SEGMENT);
  return (
    [...items]
      .sort((a, b) => a.plan_order - b.plan_order)
      .find(
        (item) =>
          Math.floor(item.plan_order / PLAN_LEVEL_SEGMENT) === segment &&
          item.plan_order > current.plan_order &&
          item.status !== 'completed'
      )?.lesson_id ?? null
  );
}

export function groupPlanItemsByUnit(items: UserLearningPlanItem[]) {
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      subtitle: string;
      items: UserLearningPlanItem[];
    }
  >();

  for (const item of [...items].sort((a, b) => a.plan_order - b.plan_order)) {
    const lesson = item.lesson_list_detail;
    const unitIdentity =
      lesson?.unit_key || lesson?.unit_id || lesson?.unit_name || 'course';
    const key = String(unitIdentity);
    const existing = groups.get(key);
    const fallbackNumber = groups.size + 1;
    const group = existing ?? {
      key,
      name:
        lesson?.unit_name ||
        lesson?.unit_title ||
        lesson?.unitTitle ||
        `Unit ${fallbackNumber}`,
      subtitle: lesson?.unit_subtitle || '',
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()];
}
