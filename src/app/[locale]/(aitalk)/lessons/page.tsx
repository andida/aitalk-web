import { redirect } from 'next/navigation';

import {
  getActiveLearningPlan,
  getProfile,
  getProfileCompleteness,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import {
  LessonHero,
  LessonPath,
} from '@/features/aitalk/ui/lesson-components';

export default async function LessonsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createAitalkServerClient();
  const profile = await getProfile(supabase).catch(() => null);
  if (!getProfileCompleteness(profile)) {
    redirect(withLocale('/onboarding', locale));
  }

  const activePlan = await getActiveLearningPlan(supabase).catch(() => null);

  return (
    <AitalkAppShell active="/lessons">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <LessonHero
          lesson={activePlan?.lesson ?? null}
          i18n={activePlan?.lessonI18n}
          progress={activePlan?.progress}
          plan={activePlan?.plan}
          locale={locale}
        />
        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-black tracking-tight">
            Course path
          </h2>
          <LessonPath
            items={activePlan?.items ?? []}
            currentLessonId={activePlan?.lesson?.id}
            locale={locale}
            planId={activePlan?.plan?.id}
          />
        </section>
      </div>
    </AitalkAppShell>
  );
}
