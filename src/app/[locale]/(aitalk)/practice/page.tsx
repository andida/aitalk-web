import { redirect } from 'next/navigation';
import {
  getActiveLearningPlan,
  getLessonById,
  getProfile,
  getProfileCompleteness,
  getTeachers,
  getTopicExerciseById,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import { PracticeClient } from '@/features/aitalk/ui/practice-client';

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lesson?: string; topic?: string }>;
}) {
  const { locale } = await params;
  const { lesson: lessonParam, topic: topicParam } = await searchParams;
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
    lessonId && Number.isFinite(lessonId)
      ? await getLessonById(supabase, lessonId)
      : (activePlan?.lesson ?? null);
  const topic =
    topicId && Number.isFinite(topicId)
      ? await getTopicExerciseById(supabase, topicId).catch(() => null)
      : null;
  const teacher = teachers[0] ?? null;

  return (
    <AitalkAppShell active="/practice">
      <PracticeClient
        lesson={lesson}
        locale={locale}
        planId={activePlan?.plan?.id ?? undefined}
        topic={topic}
        learnLanguage={profile?.learn_language || 'English'}
        nativeLanguage={
          profile?.native_language || profile?.native_language_code || 'English'
        }
        speechLocale={profile?.learn_language_code || 'en-US'}
        speechStyle={teacher?.style || 'friendly'}
        teacherName={teacher?.name || undefined}
        voiceName={teacher?.voice_name || teacher?.voiceName || undefined}
      />
    </AitalkAppShell>
  );
}
