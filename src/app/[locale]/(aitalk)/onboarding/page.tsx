import { redirect } from 'next/navigation';

import {
  getLanguages,
  getProfile,
  getProfileCompleteness,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { OnboardingForm } from '@/features/aitalk/ui/onboarding-form';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createAitalkServerClient();
  const [profile, languages] = await Promise.all([
    getProfile(supabase).catch(() => null),
    getLanguages(supabase).catch(() => []),
  ]);

  if (getProfileCompleteness(profile)) {
    redirect(withLocale('/app', locale));
  }

  return (
    <main className="min-h-[100dvh] bg-[#f6fbf8] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 pt-4 md:mb-8 md:pt-8">
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Setup
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Build your speaking plan.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            These choices stay synced with the mobile app. Your first course
            path is created after this flow.
          </p>
        </section>

        {languages.length > 0 ? (
          <OnboardingForm locale={locale} languages={languages} profile={profile} />
        ) : (
          <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/5">
            <div className="text-xl font-black">Languages unavailable</div>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              The `languages` table could not be loaded from Supabase. Check the
              shared project credentials and row-level security policies.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
