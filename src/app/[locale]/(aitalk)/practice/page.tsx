import { redirect } from 'next/navigation';

import {
  getActiveLearningPlan,
  getLessonById,
  getProfile,
  getProfileCompleteness,
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
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { locale } = await params;
  const { lesson: lessonParam } = await searchParams;
  const supabase = await createAitalkServerClient();
  const profile = await getProfile(supabase).catch(() => null);
  if (!getProfileCompleteness(profile)) {
    redirect(withLocale('/onboarding', locale));
  }

  const lessonId = lessonParam ? Number.parseInt(lessonParam, 10) : null;
  const activePlan = await getActiveLearningPlan(supabase).catch(() => null);
  const lesson =
    lessonId && Number.isFinite(lessonId)
      ? await getLessonById(supabase, lessonId)
      : activePlan?.lesson ?? null;

  return (
    <AitalkAppShell active="/practice">
      <PracticeClient
        lesson={lesson}
        locale={locale}
        speechLocale={profile?.learn_language_code || 'en-US'}
      />
    </AitalkAppShell>
  );
}
