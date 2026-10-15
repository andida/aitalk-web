import type {
  ConversationMode,
  TutorPracticeReport,
  UserLessonProgress,
} from '../types';
import {
  buildPracticeReport,
  isTutorCompletion,
  readCriteriaStatusFromTutor,
  readTutorNumber,
} from './tutor-report';

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
    getProgress(): Promise<UserLessonProgress | null>;
    saveReport(report: TutorPracticeReport): Promise<void>;
    complete(report: TutorPracticeReport): Promise<void>;
  }
): Promise<TutorPracticeReport | null> {
  if (
    input.autoSend ||
    input.mode !== 'guided' ||
    !isTutorCompletion(input.raw)
  )
    return null;
  if (readTutorNumber(input.raw, ['score']) === null) return null;
  // This fresh read prevents sequential duplicate completions, not concurrent ones.
  const progress = await source.getProgress();
  if (progress?.status === 'completed') return null;
  const report = buildPracticeReport(
    input.raw,
    readCriteriaStatusFromTutor(input.raw, input.criteria, true),
    true
  );
  await source.saveReport(report);
  await source.complete(report);
  return report;
}
