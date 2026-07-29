import { startLessonAction } from '@/features/aitalk/actions';
import { CheckCircle2, Clock, Flag, PlayCircle } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { cn } from '@/shared/lib/utils';

import { displayLessonSubtitle, displayLessonTitle } from '../data';
import { groupPlanItemsByUnit } from '../lib/course-plan';
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
    <section className="rounded-3xl border border-emerald-950/10 bg-emerald-50/70 p-5 shadow-sm md:p-8 dark:border-white/10 dark:bg-emerald-500/10">
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
          <form
            action={startLessonAction.bind(null, locale, lesson.id, plan?.id)}
          >
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
  compact = false,
  items,
  currentLessonId,
  locale,
  planId,
}: {
  compact?: boolean;
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

  const groups = groupPlanItemsByUnit(items);
  const level =
    items[0]?.lesson_list_detail?.level_id ??
    items[0]?.lesson_list_detail?.levelId ??
    1;
  const completedCount = items.filter(
    (item) => item.status === 'completed'
  ).length;

  return (
    <div className="grid gap-5">
      {!compact ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-emerald-950/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
          <div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              Your current course
            </div>
            <div className="mt-1 text-xl font-black">
              Level {level} · {groups.length} units
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              A clear path from guided practice to confident conversation.
            </p>
          </div>
          <Badge
            variant="secondary"
            className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100"
          >
            {completedCount}/{items.length} lessons complete
          </Badge>
        </div>
      ) : null}

      {groups.map((group, groupIndex) => {
        const completedInUnit = group.items.filter(
          (item) => item.status === 'completed'
        ).length;
        const unitPercent = Math.round(
          (completedInUnit / group.items.length) * 100
        );

        return (
          <section
            key={group.key}
            aria-labelledby={`course-unit-${groupIndex}`}
            className="rounded-3xl border border-emerald-950/10 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex flex-col gap-3 border-b border-emerald-950/10 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
              <div>
                <div className="text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                  Unit {groupIndex + 1}
                </div>
                <h3
                  id={`course-unit-${groupIndex}`}
                  className="mt-1 text-lg font-black"
                >
                  {group.name}
                </h3>
                {group.subtitle ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {group.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="min-w-40">
                <div className="mb-1.5 flex justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  <span>
                    {completedInUnit}/{group.items.length} done
                  </span>
                  <span>{unitPercent}%</span>
                </div>
                <Progress
                  value={unitPercent}
                  className="h-2 bg-emerald-100 dark:bg-white/10 [&_[data-slot=progress-indicator]]:bg-emerald-500"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {group.items.map((item, lessonIndex) => {
                const lesson = item.lesson_list_detail;
                const completed = item.status === 'completed';
                const current = item.lesson_id === currentLessonId;
                const duration =
                  lesson?.duration_minutes ?? lesson?.durationMinutes ?? 10;
                return (
                  <form
                    key={`${item.plan_id}-${item.lesson_id}`}
                    action={startLessonAction.bind(
                      null,
                      locale,
                      item.lesson_id,
                      planId
                    )}
                    className={cn(
                      'rounded-2xl border transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none',
                      current
                        ? 'border-emerald-400 bg-emerald-50/60 shadow-sm dark:bg-emerald-500/10'
                        : 'border-transparent hover:border-emerald-200 hover:bg-emerald-50/40 dark:hover:border-emerald-400/30 dark:hover:bg-white/5'
                    )}
                  >
                    <button
                      type="submit"
                      className="flex min-h-20 w-full items-center gap-3 rounded-2xl p-3 text-left focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none sm:gap-4"
                    >
                      <div
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black',
                          completed
                            ? 'bg-emerald-500 text-white'
                            : current
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100'
                              : 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300'
                        )}
                      >
                        {completed ? (
                          <CheckCircle2 className="size-5" />
                        ) : current ? (
                          <PlayCircle className="size-5" />
                        ) : (
                          lessonIndex + 1
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-0 truncate text-sm font-black sm:text-base">
                            {displayLessonTitle(lesson ?? null)}
                          </div>
                          {current ? (
                            <Badge className="rounded-full bg-emerald-500 text-white">
                              Current
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600 sm:text-sm dark:text-zinc-300">
                          {displayLessonSubtitle(lesson ?? null)}
                        </p>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          <Clock className="size-3.5" />
                          {duration} min
                        </div>
                        <div className="mt-1 text-xs font-black text-zinc-600 dark:text-zinc-300">
                          {completed
                            ? 'Completed'
                            : current
                              ? 'Continue'
                              : 'Upcoming'}
                        </div>
                      </div>
                    </button>
                  </form>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
