import { notFound, redirect } from 'next/navigation';
import {
  displayLessonSubtitle,
  displayLessonTitle,
  getActiveLearningPlan,
  getLessonById,
  getLessonI18n,
  getLessonProgress,
  getLessonStepI18nMap,
  getLessonSteps,
  getProfile,
  getProfileCompleteness,
  startLessonProgress,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import type { CourseLessonStep } from '@/features/aitalk/types';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import { MessageCircle, RotateCcw } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const lessonId = Number.parseInt(id, 10);
  if (!Number.isFinite(lessonId)) notFound();

  const supabase = await createAitalkServerClient();
  const profile = await getProfile(supabase).catch(() => null);
  if (!getProfileCompleteness(profile)) {
    redirect(withLocale('/onboarding', locale));
  }

  const activePlan = await getActiveLearningPlan(supabase).catch(() => null);
  const lesson = await getLessonById(supabase, lessonId);
  if (!lesson) notFound();

  if (activePlan?.plan?.id) {
    await startLessonProgress(supabase, lessonId, activePlan.plan.id).catch(
      () => null
    );
  }

  const [i18n, steps, progress] = await Promise.all([
    getLessonI18n(supabase, lessonId, profile).catch(() => null),
    getLessonSteps(supabase, lessonId).catch(() => []),
    getLessonProgress(supabase, lessonId).catch(() => null),
  ]);
  const stepI18n = await getLessonStepI18nMap(supabase, steps, profile).catch(
    () => new Map()
  );
  const isCompleted = progress?.status === 'completed';

  return (
    <AitalkAppShell active="/lessons">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge className="rounded-full bg-emerald-500 text-white">
                {isCompleted ? 'Completed' : 'In progress'}
              </Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                {displayLessonTitle(lesson, i18n)}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base dark:text-zinc-300">
                {displayLessonSubtitle(lesson, i18n)}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {isCompleted ? (
                <>
                  <Button
                    asChild
                    className="h-11 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    <Link href={`/practice?lesson=${lesson.id}`}>
                      <RotateCcw className="size-5" />
                      Review
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                  >
                    <Link href={`/practice?lesson=${lesson.id}&mode=free`}>
                      <MessageCircle className="size-5" />
                      Free talk
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  className="h-11 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  <Link href={`/practice?lesson=${lesson.id}`}>
                    <MessageCircle className="size-5" />
                    Continue practice
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3">
          {(steps.length > 0 ? steps : fallbackSteps(lesson)).map(
            (step, index) => {
              const translated = stepI18n.get(step.id);
              const content = translated?.content ?? step.content;
              return (
                <div
                  key={step.id || index}
                  className="rounded-3xl border border-emerald-950/10 bg-white p-5 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black">
                        {translated?.title || step.title || `Step ${index + 1}`}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {translated?.prompt ||
                          step.prompt ||
                          step.instruction ||
                          stringifyContent(content)}
                      </p>
                      {translated?.example || step.example ? (
                        <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
                          {translated?.example || step.example}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </section>
      </div>
    </AitalkAppShell>
  );
}

function stringifyContent(content: unknown) {
  if (!content) return 'Read the prompt, say your answer, then continue.';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    const record = content as Record<string, unknown>;
    return String(
      record.instruction ||
        record.prompt ||
        record.text ||
        record.sentence ||
        Object.values(record).find((value) => typeof value === 'string') ||
        'Practice this step out loud.'
    );
  }
  return String(content);
}

function fallbackSteps(lesson: any): CourseLessonStep[] {
  return [
    {
      id: 0,
      lesson_id: lesson.id,
      title: 'Words',
      content: lesson.lesson_words || 'Review the key words for this lesson.',
      status: 1,
    },
    {
      id: 1,
      lesson_id: lesson.id,
      title: 'Sentence',
      content:
        lesson.lesson_sentence ||
        'Say one useful sentence connected to this lesson.',
      status: 1,
    },
    {
      id: 2,
      lesson_id: lesson.id,
      title: 'Free answer',
      content: 'Use the practice page to answer in your own words.',
      status: 1,
    },
  ];
}
