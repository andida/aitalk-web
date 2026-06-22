import { redirect } from 'next/navigation';
import {
  displayTopicPrompt,
  displayTopicTitle,
  getProfile,
  getProfileCompleteness,
  getTeachers,
  getTopicExercises,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import { MessageCircle, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

export default async function ExplorePage({
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

  const [teachers, topics] = await Promise.all([
    getTeachers(supabase, profile?.learn_language || undefined).catch(() => []),
    getTopicExercises(supabase, profile?.native_language).catch(() => []),
  ]);

  return (
    <AitalkAppShell active="/explore">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-6">
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Explore
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Tutors and prompts
          </h1>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-black">Tutors</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teachers.map((teacher) => (
              <Card
                key={teacher.id}
                className="rounded-3xl border-emerald-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <CardContent className="px-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        teacher.avatar_url || teacher.avatarUrl || '/logo.svg'
                      }
                      alt={teacher.name}
                      className="size-16 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-lg font-black">{teacher.name}</div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">
                        {teacher.nationality || teacher.language}
                      </div>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="mt-5 h-10 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    <Link href="/practice">
                      <MessageCircle className="size-4" />
                      Practice
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-black">Topics</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/practice?topic=${topic.id}`}
                className="group block rounded-3xl focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-zinc-950"
              >
                <Card className="h-full rounded-3xl border-emerald-950/10 bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-emerald-300 group-hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:group-hover:border-emerald-400/40">
                  <CardContent className="px-5">
                    <Sparkles className="size-6 text-emerald-600 dark:text-emerald-300" />
                    <div className="mt-4 text-lg font-black">
                      {displayTopicTitle(topic)}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      {displayTopicPrompt(topic)}
                    </p>
                    <div className="mt-4 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      Practice this topic
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AitalkAppShell>
  );
}
