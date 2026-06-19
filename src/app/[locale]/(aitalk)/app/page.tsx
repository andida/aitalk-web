import { redirect } from 'next/navigation';
import { BookOpen, CalendarDays, MessageCircle, Sparkles } from 'lucide-react';

import {
  displayLessonSubtitle,
  getActiveLearningPlan,
  getProfile,
  getProfileCompleteness,
  getStatistics,
  getTeachers,
  getTopicExercises,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import {
  LessonHero,
  LessonPath,
} from '@/features/aitalk/ui/lesson-components';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Link } from '@/core/i18n/navigation';

export default async function AitalkAppPage({
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

  const [activePlan, teachers, topics, stats] = await Promise.all([
    getActiveLearningPlan(supabase).catch(() => null),
    getTeachers(supabase, profile?.learn_language || undefined).catch(() => []),
    getTopicExercises(supabase, profile?.native_language).catch(() => []),
    getStatistics(supabase).catch(() => ({
      todayTime: '0',
      totalTime: '0',
      dayCount: '0',
    })),
  ]);

  return (
    <AitalkAppShell active="/app">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              Home
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Hi {profile?.nick_name || 'there'}, keep speaking.
            </h1>
          </div>
          <Button
            asChild
            className="h-11 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Link href="/practice">
              <MessageCircle className="size-5" />
              Quick practice
            </Link>
          </Button>
        </div>

        <LessonHero
          lesson={activePlan?.lesson ?? null}
          i18n={activePlan?.lessonI18n}
          progress={activePlan?.progress}
          plan={activePlan?.plan}
          locale={locale}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard icon={CalendarDays} label="Study days" value={stats.dayCount} />
          <StatCard icon={Sparkles} label="Today minutes" value={stats.todayTime} />
          <StatCard icon={BookOpen} label="Total minutes" value={stats.totalTime} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black">Your path</h2>
              <Link
                href="/lessons"
                className="text-sm font-bold text-emerald-700 dark:text-emerald-300"
              >
                View all
              </Link>
            </div>
            <LessonPath
              items={(activePlan?.items ?? []).slice(0, 5)}
              currentLessonId={activePlan?.lesson?.id}
              locale={locale}
              planId={activePlan?.plan?.id}
            />
          </section>

          <section className="grid gap-4">
            <Card className="rounded-3xl border-emerald-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <CardContent className="px-5">
                <h2 className="text-xl font-black">Tutor team</h2>
                <div className="mt-4 grid gap-3">
                  {teachers.slice(0, 3).map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 dark:bg-white/10"
                    >
                      <img
                        src={teacher.avatar_url || teacher.avatarUrl || '/logo.svg'}
                        alt={teacher.name}
                        className="size-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-black">{teacher.name}</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300">
                          {teacher.nationality || profile?.learn_language}
                        </div>
                      </div>
                    </div>
                  ))}
                  {teachers.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      No tutors loaded yet. Check the `teacher` table.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-emerald-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <CardContent className="px-5">
                <h2 className="text-xl font-black">Speaking prompts</h2>
                <div className="mt-4 grid gap-3">
                  {topics.slice(0, 3).map((topic) => (
                    <div
                      key={topic.id}
                      className="rounded-2xl border border-emerald-950/10 p-3 dark:border-white/10"
                    >
                      <div className="font-bold">
                        {topic.title || topic.name || `Topic ${topic.id}`}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {topic.desc || topic.description || topic.content || displayLessonSubtitle(activePlan?.lesson ?? null)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </AitalkAppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <Icon className="size-6 text-emerald-600 dark:text-emerald-300" />
      <div className="mt-4 text-3xl font-black">{value}</div>
      <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
    </div>
  );
}
