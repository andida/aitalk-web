import { redirect } from 'next/navigation';
import { BookMarked, CalendarDays, Clock, LogOut } from 'lucide-react';

import { signOutAction } from '@/features/aitalk/actions';
import {
  getCollectList,
  getProfile,
  getProfileCompleteness,
  getStatistics,
  getUsage,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

export default async function MePage({
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

  const [stats, collects, usage] = await Promise.all([
    getStatistics(supabase).catch(() => ({
      todayTime: '0',
      totalTime: '0',
      dayCount: '0',
    })),
    getCollectList(supabase, profile?.learn_language).catch(() => []),
    getUsage(supabase).catch(() => []),
  ]);
  const usageRow = usage[0] ?? {};

  return (
    <AitalkAppShell active="/me">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Profile
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                {profile?.nick_name || 'AITalk learner'}
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Learning {profile?.learn_language} from{' '}
                {profile?.native_language}. Goal: {profile?.learning_goal}.
              </p>
            </div>
            <form action={signOutAction.bind(null, locale)}>
              <Button variant="outline" className="h-11 rounded-xl">
                <LogOut className="size-5" />
                Sign out
              </Button>
            </form>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric icon={CalendarDays} label="Study days" value={stats.dayCount} />
          <Metric icon={Clock} label="Today minutes" value={stats.todayTime} />
          <Metric icon={BookMarked} label="Saved items" value={`${collects.length}`} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl border-emerald-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
            <CardContent className="px-5">
              <h2 className="text-xl font-black">Learning settings</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <Row label="Level" value={profile?.level_language || '1'} />
                <Row
                  label="Focus"
                  value={profile?.learning_focus || 'confidence'}
                />
                <Row
                  label="Daily goal"
                  value={`${profile?.daily_study_minutes || 10} minutes`}
                />
              </dl>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-emerald-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
            <CardContent className="px-5">
              <h2 className="text-xl font-black">Account status</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <Row
                  label="VIP"
                  value={usageRow.vipStatus || usageRow.vip_status || 'expired'}
                />
                <Row label="Total minutes" value={stats.totalTime} />
                <Row label="Plan" value={profile?.learning_plan_created ? 'Ready' : 'Missing'} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <section className="mt-6 rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-xl font-black">Collections</h2>
          <div className="mt-4 grid gap-3">
            {collects.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-emerald-950/10 p-3 dark:border-white/10"
              >
                <div className="font-bold">
                  {item.word?.word ||
                    item.word?.text ||
                    item.word?.content ||
                    `Saved item ${item.id}`}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  {item.type || 'word'} | {item.language || profile?.learn_language}
                </div>
              </div>
            ))}
            {collects.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Saved words and sentences will appear here.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AitalkAppShell>
  );
}

function Metric({
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2 dark:bg-white/10">
      <dt className="font-bold text-zinc-600 dark:text-zinc-300">{label}</dt>
      <dd className="font-black">{value}</dd>
    </div>
  );
}
