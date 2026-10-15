import type {
  ActiveLearningPlan,
  CourseLessonStep,
  LessonListDetail,
  PracticeMode,
  UserLessonProgress,
} from '../types';

interface CoursePracticeSource {
  getActivePlan(): Promise<ActiveLearningPlan>;
  getLesson(id: number): Promise<LessonListDetail | null>;
  getProgress(id: number): Promise<UserLessonProgress | null>;
  getSteps(id: number): Promise<CourseLessonStep[]>;
}

// Progress must be known before choosing a mode or loading a mutable plan.
// A failed progress read must never turn review into a scored guided session.
export async function loadCoursePractice(
  lessonId: number | null,
  requestedMode: string | undefined,
  source: CoursePracticeSource
) {
  let activePlan = lessonId ? null : await source.getActivePlan();
  const lesson = lessonId
    ? await source.getLesson(lessonId)
    : (activePlan?.lesson ?? null);
  if (!lesson) return null;

  const [progress, steps] = await Promise.all([
    source.getProgress(lesson.id),
    source.getSteps(lesson.id),
  ]);
  const practiceMode: PracticeMode =
    progress?.status === 'completed'
      ? requestedMode === 'free'
        ? 'completed_lesson_free'
        : 'review'
      : 'guided';

  if (practiceMode === 'guided' && lessonId) {
    activePlan = await source.getActivePlan();
  }
  // Review and completed-lesson free talk never receive a writable plan.
  if (practiceMode !== 'guided') activePlan = null;
  return { lesson, progress, steps, practiceMode, activePlan };
}
