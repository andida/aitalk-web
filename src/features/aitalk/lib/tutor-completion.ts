import type { ConversationMode, TutorPracticeReport } from '../types';
import {
  buildPracticeReport,
  isTutorCompletion,
  readCriteriaStatusFromTutor,
  readTutorNumber,
} from './tutor-report';

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

export function isTutorPracticeReport(
  value: unknown
): value is TutorPracticeReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  const criteria = report.criteria_status;
  const improvedSentence = report.improved_sentence;

  return (
    Number.isInteger(report.score) &&
    Number(report.score) >= 0 &&
    Number(report.score) <= 100 &&
    Array.isArray(criteria) &&
    criteria.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const criterion = item as Record<string, unknown>;
      return (
        typeof criterion.label === 'string' &&
        criterion.label.trim().length > 0 &&
        (criterion.status === 'pending' ||
          criterion.status === 'met' ||
          criterion.status === 'missed') &&
        (criterion.evidence == null || typeof criterion.evidence === 'string')
      );
    }) &&
    isStringArray(report.target_chunks_used) &&
    typeof report.feedback_summary === 'string' &&
    isStringArray(report.weak_points) &&
    isStringArray(report.review_items) &&
    (improvedSentence == null ||
      (typeof improvedSentence === 'object' &&
        typeof (improvedSentence as Record<string, unknown>).improved ===
          'string' &&
        String((improvedSentence as Record<string, unknown>).improved).trim()
          .length > 0 &&
        ((improvedSentence as Record<string, unknown>).original == null ||
          typeof (improvedSentence as Record<string, unknown>).original ===
            'string') &&
        ((improvedSentence as Record<string, unknown>).reason == null ||
          typeof (improvedSentence as Record<string, unknown>).reason ===
            'string')))
  );
}

export function readTutorCompletionScore(raw: unknown) {
  const score = readTutorNumber(raw, ['score']);
  return score !== null && Number.isInteger(score) && score >= 0 && score <= 100
    ? score
    : null;
}

export function resolveTutorMode(
  requested: unknown,
  completed: boolean
): ConversationMode {
  const mode =
    requested === 'review' ||
    requested === 'topic_free' ||
    requested === 'completed_lesson_free'
      ? requested
      : 'guided';
  return completed && mode === 'guided' ? 'review' : mode;
}

export async function saveTutorCompletion(
  input: {
    mode: ConversationMode;
    autoSend: boolean;
    raw: unknown;
    criteria: string[];
  },
  source: {
    commit(report: TutorPracticeReport): Promise<TutorPracticeReport | null>;
  }
): Promise<TutorPracticeReport | null> {
  if (
    input.autoSend ||
    input.mode !== 'guided' ||
    !isTutorCompletion(input.raw)
  )
    return null;
  if (readTutorCompletionScore(input.raw) === null) return null;
  const report = buildPracticeReport(
    input.raw,
    readCriteriaStatusFromTutor(input.raw, input.criteria, true),
    true
  );
  if (!isTutorPracticeReport(report)) return null;
  // The database commits report, progress and plan advancement together.
  return source.commit(report);
}
