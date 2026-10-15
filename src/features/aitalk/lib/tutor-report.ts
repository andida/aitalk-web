import type {
  TutorCriteriaStatus,
  TutorImprovedSentence,
  TutorPracticeReport,
} from '../types';

type TutorRaw = {
  raw?: unknown;
  data?: unknown;
  response?: unknown;
  task_passed?: unknown;
  taskPassed?: unknown;
  should_complete_lesson?: unknown;
  shouldCompleteLesson?: unknown;
  [key: string]: unknown;
};

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

function parseTutorBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

function readTutorBoolean(value: unknown, keys: string[]): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as TutorRaw;

  for (const key of keys) {
    if (key in record && parseTutorBoolean(record[key])) return true;
  }

  return [record.raw, record.data, record.response].some((nested) =>
    readTutorBoolean(nested, keys)
  );
}

export function isTutorCompletion(raw: unknown) {
  return (
    readTutorBoolean(raw, ['task_passed', 'taskPassed']) &&
    readTutorBoolean(raw, ['should_complete_lesson', 'shouldCompleteLesson'])
  );
}

function readTutorValue(value: unknown, keys: string[]): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as TutorRaw;

  for (const key of keys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  for (const nested of [record.raw, record.data, record.response]) {
    const nestedValue = readTutorValue(nested, keys);
    if (nestedValue !== undefined) return nestedValue;
  }

  return undefined;
}

function readTutorString(raw: unknown, keys: string[]) {
  const value = readTutorValue(raw, keys);
  return typeof value === 'string' ? value.trim() : '';
}

export function readTutorNumber(raw: unknown, keys: string[]) {
  const value = readTutorValue(raw, keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readTutorStringList(raw: unknown, keys: string[]) {
  const value = readTutorValue(raw, keys);
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

export function buildPendingCriteria(
  criteria: string[]
): TutorCriteriaStatus[] {
  return criteria.map((label) => ({
    label,
    status: 'pending',
  }));
}

function normalizeCriteriaStatusValue(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (
    status === 'met' ||
    status === 'done' ||
    status === 'pass' ||
    status === 'passed' ||
    status === 'complete' ||
    status === 'completed'
  ) {
    return 'met' as const;
  }
  if (
    status === 'missed' ||
    status === 'fail' ||
    status === 'failed' ||
    status === 'needs_work'
  ) {
    return 'missed' as const;
  }
  return 'pending' as const;
}

function parseCriteriaStatusList(value: unknown): TutorCriteriaStatus[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const label = String(record.label || record.criteria || '').trim();
      if (!label) return null;
      return {
        label,
        status: normalizeCriteriaStatusValue(record.status),
        evidence:
          typeof record.evidence === 'string' ? record.evidence.trim() : null,
      } satisfies TutorCriteriaStatus;
    })
    .filter(Boolean) as TutorCriteriaStatus[];
}

export function mergeCriteriaStatuses(
  current: TutorCriteriaStatus[],
  next: TutorCriteriaStatus[],
  fallbackCriteria: string[]
) {
  const base = current.length
    ? [...current]
    : buildPendingCriteria(fallbackCriteria);
  const indexByLabel = new Map(
    base.map((item, index) => [item.label.toLowerCase(), index])
  );

  for (const item of next) {
    const key = item.label.toLowerCase();
    const index = indexByLabel.get(key);
    if (index === undefined) {
      indexByLabel.set(key, base.length);
      base.push(item);
      continue;
    }
    base[index] = {
      ...base[index],
      ...item,
      status:
        item.status === 'pending' && base[index].status === 'met'
          ? 'met'
          : item.status,
    };
  }

  return base;
}

export function readCriteriaStatusFromTutor(
  raw: unknown,
  fallbackCriteria: string[],
  markAllMet = false
) {
  const rawList = parseCriteriaStatusList(
    readTutorValue(raw, ['criteria_status', 'criteriaStatus'])
  );
  const fallback = fallbackCriteria.map((label) => ({
    label,
    status: markAllMet ? ('met' as const) : ('pending' as const),
  }));
  if (rawList.length === 0) return fallback;
  return mergeCriteriaStatuses(fallback, rawList, fallbackCriteria);
}

function readImprovedSentence(raw: unknown): TutorImprovedSentence | null {
  const value = readTutorValue(raw, ['improved_sentence', 'improvedSentence']);
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const improved =
    typeof record.improved === 'string' ? record.improved.trim() : '';
  if (!improved) return null;
  return {
    original:
      typeof record.original === 'string' ? record.original.trim() : null,
    improved,
    reason: typeof record.reason === 'string' ? record.reason.trim() : null,
  };
}

export function buildPracticeReport(
  raw: unknown,
  criteriaStatus: TutorCriteriaStatus[],
  completed: boolean
): TutorPracticeReport {
  const score = Math.round(
    Math.min(100, Math.max(0, readTutorNumber(raw, ['score']) ?? 0))
  );
  const feedbackSummary =
    readTutorString(raw, ['feedback_summary', 'feedbackSummary']) ||
    (completed
      ? 'You completed the roleplay target. Review the weak points, then move to the next lesson.'
      : 'Keep practicing the checklist items before completing this lesson.');

  return {
    score,
    criteria_status: criteriaStatus,
    target_chunks_used: readTutorStringList(raw, [
      'target_chunks_used',
      'targetChunksUsed',
    ]),
    feedback_summary: feedbackSummary,
    weak_points: readTutorStringList(raw, ['weak_points', 'weakPoints']).slice(
      0,
      4
    ),
    review_items: readTutorStringList(raw, [
      'review_items',
      'reviewItems',
    ]).slice(0, 5),
    improved_sentence: readImprovedSentence(raw),
  };
}
