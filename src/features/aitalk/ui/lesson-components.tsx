import { CheckCircle2, Circle, Clock, Flag, PlayCircle } from 'lucide-react';

import { startLessonAction } from '@/features/aitalk/actions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { cn } from '@/shared/lib/utils';

import {
  displayLessonSubtitle,
  displayLessonTitle,
} from '../data';
import type {
  CourseLessonI18n,
  LessonListDetail,
  UserLearningPlan,
  UserLearningPlanItem,
  UserLessonProgress,
} from '../types';

export function LessonHero({
  lesson,
  i18n,
  progress,
  plan,
  locale,
}: {
  lesson: LessonListDetail | null;
  i18n?: CourseLessonI18n | null;
  progress?: UserLessonProgress | null;
  plan?: UserLearningPlan | null;
  locale: string;
}) {
  const percent = progress?.progress_percent ?? 0;
  return (
    <section className="rounded-3xl border border-emerald-950/10 bg-gradient-to-br from-emerald-100 via-white to-white p-5 shadow-sm md:p-8 dark:border-white/10 dark:from-emerald-500/20 dark:via-white/5 dark:to-white/5">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Today lesson
          </div>
          <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
            {displayLessonTitle(lesson, i18n)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base dark:text-zinc-300">
            {displayLessonSubtitle(lesson, i18n)}
          </p>
          {lesson ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full">
                <Clock className="size-3" />
                {lesson.duration_minutes ?? lesson.durationMinutes ?? 10} min
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                <Flag className="size-3" />
                Level {lesson.level_id ?? lesson.levelId ?? plan?.level ?? '1'}
              </Badge>
            </div>
          ) : null}
        </div>
        {lesson ? (
          <form action={startLessonAction.bind(null, locale, lesson.id, plan?.id)}>
            <Button className="h-12 rounded-xl bg-emerald-500 px-6 text-base font-bold text-white hover:bg-emerald-600">
              <PlayCircle className="size-5" />
              Start
            </Button>
          </form>
        ) : null}
      </div>
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-zinc-600 dark:text-zinc-300">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <Progress
          value={percent}
          className="h-3 bg-emerald-100 dark:bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-500"
        />
      </div>
    </section>
  );
}

export function LessonPath({
  items,
  currentLessonId,
  locale,
  planId,
}: {
  items: UserLearningPlanItem[];
  currentLessonId?: number | null;
  locale: string;
  planId?: number | null;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-emerald-950/20 bg-white p-8 text-center dark:border-white/15 dark:bg-white/5">
        <div className="text-lg font-black">No lesson path yet</div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Complete onboarding to generate a personalized path.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const lesson = item.lesson_list_detail;
        const completed = item.status === 'completed';
        const current = item.lesson_id === currentLessonId;
        return (
          <form
            key={item.id}
            action={startLessonAction.bind(null, locale, item.lesson_id, planId)}
            className={cn(
              'rounded-2xl border bg-white p-4 transition hover:border-emerald-300 dark:bg-white/5',
              current
                ? 'border-emerald-400 shadow-sm shadow-emerald-950/5'
                : 'border-emerald-950/10 dark:border-white/10'
            )}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-4 text-left"
            >
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  completed
                    ? 'bg-emerald-500 text-white'
                    : current
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-white/10'
                )}
              >
                {completed ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Circle className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-base font-black">
                    {displayLessonTitle(lesson ?? null)}
                  </div>
                  {current ? (
                    <Badge className="rounded-full bg-emerald-500 text-white">
                      Current
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                  {displayLessonSubtitle(lesson ?? null)}
                </p>
              </div>
              <div className="hidden text-sm font-bold text-zinc-500 md:block">
                {completed ? 'Done' : item.status === 'in_progress' ? 'Open' : 'Start'}
              </div>
            </button>
          </form>
        );
      })}
    </div>
  );
}
