import { redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';

import { getProfileCompleteness } from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { AitalkLoginClient } from '@/features/aitalk/ui/login-client';

export default async function AitalkLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  const { redirect: next = '/app' } = await searchParams;
  const supabase = await createAitalkServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from('profile')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    const complete = getProfileCompleteness(data?.[0] ?? null);
    redirect(withLocale(complete ? next : '/onboarding', locale));
  }

  return (
    <main className="min-h-[100dvh] bg-[#f6fbf8] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-white/10">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <GraduationCap className="size-6" />
            </div>
            <span className="font-black">AITalk.im</span>
          </div>
          <h1 className="mt-8 max-w-2xl text-5xl font-black tracking-tight md:text-7xl">
            Practice speaking with an AI tutor.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 md:text-lg dark:text-zinc-300">
            Sign in with the same Google or Apple account you use in the app to
            continue your profile, plan, progress and collections.
          </p>
        </section>

        <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/5">
          <div className="text-2xl font-black">Welcome back</div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            AITalk Web uses Supabase Auth as the shared account system.
          </p>
          <div className="mt-6">
            <AitalkLoginClient locale={locale} redirect={next} />
          </div>
          <p className="mt-5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            By continuing, you agree to use AITalk with the account providers
            configured in the shared Supabase project.
          </p>
        </section>
      </div>
    </main>
  );
}
