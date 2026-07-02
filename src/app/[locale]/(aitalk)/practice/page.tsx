import { redirect } from 'next/navigation';
import {
  getActiveLearningPlan,
  getLessonById,
  getLessonPracticeConfig,
  getLessonProgress,
  getLessonSteps,
  getNextPlanLessonId,
  getProfile,
  getProfileCompleteness,
  getTeachers,
  getTopicExerciseById,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import type { PracticeMode } from '@/features/aitalk/types';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import { PracticeClient } from '@/features/aitalk/ui/practice-client';

function normalizePracticeMode(
  requestedMode: string | undefined,
  isCompleted: boolean,
  hasLesson: boolean,
  hasTopic: boolean
): PracticeMode {
  if (hasTopic) return 'topic';
  if (!hasLesson) return 'guided';
  if (!isCompleted) return 'guided';
  return requestedMode === 'free' ? 'free' : 'review';
}

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lesson?: string; mode?: string; topic?: string }>;
}) {
  const { locale } = await params;
  const {
    lesson: lessonParam,
    mode: modeParam,
    topic: topicParam,
  } = await searchParams;
  const supabase = await createAitalkServerClient();
  const profile = await getProfile(supabase).catch(() => null);
  if (!getProfileCompleteness(profile)) {
    redirect(withLocale('/onboarding', locale));
  }

  const lessonId = lessonParam ? Number.parseInt(lessonParam, 10) : null;
  const topicId = topicParam ? Number.parseInt(topicParam, 10) : null;
  const [activePlan, teachers] = await Promise.all([
    getActiveLearningPlan(supabase).catch(() => null),
    getTeachers(supabase, profile?.learn_language || undefined).catch(() => []),
  ]);
  const lesson =
    topicId && Number.isFinite(topicId)
      ? null
      : lessonId && Number.isFinite(lessonId)
        ? await getLessonById(supabase, lessonId)
        : (activePlan?.lesson ?? null);
  const topic =
    topicId && Number.isFinite(topicId)
      ? await getTopicExerciseById(supabase, topicId).catch(() => null)
      : null;
  const teacher = teachers[0] ?? null;
  const [lessonProgress, lessonSteps] = lesson
    ? await Promise.all([
        getLessonProgress(supabase, lesson.id).catch(() => null),
        getLessonSteps(supabase, lesson.id).catch(() => []),
      ])
    : [null, []];
  const isLessonCompleted = lessonProgress?.status === 'completed';
  const practiceMode = normalizePracticeMode(
    modeParam,
    isLessonCompleted,
    Boolean(lesson),
    Boolean(topic)
  );
  const practiceConfig = getLessonPracticeConfig(lessonSteps);
  const nextLessonId = lesson
    ? getNextPlanLessonId(activePlan, lesson.id)
    : null;
  const returnHref = topic
    ? '/explore'
    : lesson
      ? `/lessons/${lesson.id}`
      : '/app';
  const returnLabel = topic
    ? 'Back to explore'
    : lesson
      ? 'Back to lesson'
      : 'Back to home';

  return (
    <AitalkAppShell active="/practice">
      <PracticeClient
        lesson={lesson}
        locale={locale}
        planId={topic ? undefined : (activePlan?.plan?.id ?? undefined)}
        practiceMode={practiceMode}
        progressStatus={lessonProgress?.status ?? undefined}
        returnHref={returnHref}
        returnLabel={returnLabel}
        requiredTurns={practiceConfig.requiredTurns}
        successCriteria={practiceConfig.successCriteria}
        nextLessonId={nextLessonId ?? undefined}
        topic={topic}
        userId={profile?.user_id}
        learnLanguage={profile?.learn_language || 'English'}
        nativeLanguage={
          profile?.native_language || profile?.native_language_code || 'English'
        }
        speechLocale={profile?.learn_language_code || 'en-US'}
        speechStyle={teacher?.style || 'friendly'}
        teacherAvatarUrl={
          teacher?.avatar_url || teacher?.avatarUrl || undefined
        }
        teacherDescription={
          teacher?.nationality ||
          teacher?.language ||
          profile?.learn_language ||
          undefined
        }
        teacherName={teacher?.name || undefined}
        voiceName={teacher?.voice_name || teacher?.voiceName || undefined}
      />
    </AitalkAppShell>
  );
}
