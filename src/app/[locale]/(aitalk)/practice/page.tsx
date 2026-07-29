import { redirect } from 'next/navigation';
import {
  buildTopicTutorPrompt,
  displayTopicPrompt,
  displayTopicTitle,
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
import { normalizeLearningLevel } from '@/features/aitalk/lib/course-plan';
import {
  getFreeTalkTopic,
  parsePracticeQuery,
  sanitizeTopicText,
} from '@/features/aitalk/lib/free-talk-topics';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import type { FreeTalkTopic, PracticeMode } from '@/features/aitalk/types';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import { FreeTalkTopicSelector } from '@/features/aitalk/ui/free-talk-topic-selector';
import { PracticeClient } from '@/features/aitalk/ui/practice-client';

function normalizePracticeMode(
  requestedMode: string | undefined,
  isCompleted: boolean,
  hasLesson: boolean,
  hasConversationTopic: boolean
): PracticeMode {
  if (hasConversationTopic) return 'topic_free';
  if (!hasLesson) return 'guided';
  if (!isCompleted) return 'guided';
  return requestedMode === 'free' ? 'completed_lesson_free' : 'review';
}

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    lesson?: string;
    mode?: string;
    topic?: string;
    topicKey?: string;
  }>;
}) {
  const { locale } = await params;
  const rawQuery = await searchParams;
  const { lessonId, mode, topicId, topicKey } = parsePracticeQuery(rawQuery);
  const supabase = await createAitalkServerClient();
  const profile = await getProfile(supabase).catch(() => null);
  if (!getProfileCompleteness(profile)) {
    redirect(withLocale('/onboarding', locale));
  }

  const isLocalFreeTalk = mode === 'free' && !lessonId && !topicId;
  const localTopic = isLocalFreeTalk ? getFreeTalkTopic(topicKey) : null;
  if (isLocalFreeTalk && !localTopic) {
    return (
      <AitalkAppShell active="/practice">
        <FreeTalkTopicSelector invalidTopicKey={Boolean(rawQuery.topicKey)} />
      </AitalkAppShell>
    );
  }

  const [activePlan, teachers, databaseTopic] = await Promise.all([
    localTopic || topicId
      ? Promise.resolve(null)
      : getActiveLearningPlan(supabase).catch(() => null),
    getTeachers(supabase, profile?.learn_language || undefined).catch(() => []),
    topicId
      ? getTopicExerciseById(supabase, topicId).catch(() => null)
      : Promise.resolve(null),
  ]);
  const lesson =
    localTopic || topicId
      ? null
      : lessonId
        ? await getLessonById(supabase, lessonId)
        : (activePlan?.lesson ?? null);
  const conversationTopic: FreeTalkTopic | null = localTopic
    ? localTopic
    : databaseTopic
      ? {
          key: `explore-${databaseTopic.id}`,
          title: sanitizeTopicText(displayTopicTitle(databaseTopic), 80),
          description: sanitizeTopicText(
            displayTopicPrompt(databaseTopic),
            180
          ),
          openingPrompt: sanitizeTopicText(
            displayTopicPrompt(databaseTopic),
            240
          ),
          context: sanitizeTopicText(buildTopicTutorPrompt(databaseTopic), 800),
          emoji: '💬',
          recommendedLevel: `L${normalizeLearningLevel(
            profile?.level_language
          )}`,
          minutes: 10,
        }
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
    rawQuery.mode,
    isLessonCompleted,
    Boolean(lesson),
    Boolean(conversationTopic)
  );
  const practiceConfig = getLessonPracticeConfig(lessonSteps);
  const nextLessonId = lesson
    ? getNextPlanLessonId(activePlan, lesson.id)
    : null;
  const returnHref = conversationTopic
    ? localTopic
      ? '/practice?mode=free'
      : '/explore'
    : lesson
      ? `/lessons/${lesson.id}`
      : '/app';
  const returnLabel = conversationTopic
    ? localTopic
      ? 'Choose another topic'
      : 'Back to explore'
    : lesson
      ? 'Back to lesson'
      : 'Back to home';

  return (
    <AitalkAppShell active="/practice">
      <PracticeClient
        conversationTopic={conversationTopic}
        lesson={lesson}
        locale={locale}
        learnerLevel={normalizeLearningLevel(profile?.level_language)}
        planId={
          conversationTopic ? undefined : (activePlan?.plan?.id ?? undefined)
        }
        practiceMode={practiceMode}
        progressStatus={lessonProgress?.status ?? undefined}
        returnHref={returnHref}
        returnLabel={returnLabel}
        requiredTurns={practiceConfig.requiredTurns}
        successCriteria={practiceConfig.successCriteria}
        nextLessonId={nextLessonId ?? undefined}
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
