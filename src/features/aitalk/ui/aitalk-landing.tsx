import Image from 'next/image';
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarCheck,
  Headphones,
  Languages,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Volume2,
  type LucideIcon,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

export type AitalkLandingCopy = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    panel: {
      teacher: string;
      sessionType: string;
      prompt: string;
      transcript: string;
      scoreLabel: string;
      score: string;
      feedbackTitle: string;
      feedback: string;
      chips: string[];
    };
  };
  stats: { value: string; label: string }[];
  features: {
    title: string;
    description: string;
    cards: { title: string; text: string }[];
  };
  workflow: {
    title: string;
    description: string;
    items: { title: string; text: string }[];
  };
  sync: {
    title: string;
    description: string;
    bullets: string[];
    providers: string[];
  };
  cta: {
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
};

const featureIcons: LucideIcon[] = [
  Mic,
  Brain,
  BookOpenCheck,
  Headphones,
];

const workflowIcons: LucideIcon[] = [Languages, Volume2, CalendarCheck];

function PracticePanel({ copy }: { copy: AitalkLandingCopy['hero']['panel'] }) {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-emerald-200/35 blur-3xl dark:bg-emerald-500/10" />
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-white/10 dark:bg-zinc-900/80">
          <div className="flex items-center gap-4">
            <Image
              src="/imgs/avatars/8.png"
              alt={copy.teacher}
              width={56}
              height={56}
              className="size-14 rounded-2xl object-cover"
              priority
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                {copy.teacher}
              </div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {copy.sessionType}
              </div>
            </div>
            <button
              className="ml-auto inline-flex size-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 active:scale-95"
              aria-label={copy.sessionType}
            >
              <Play className="size-5 fill-current" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-zinc-200 bg-[#f6f8f3] p-4 dark:border-white/10 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              <Sparkles className="size-4 text-emerald-600" />
              {copy.prompt}
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {[28, 46, 34, 58, 42, 64, 36, 54, 30, 48, 38, 60].map(
                (height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className="w-full rounded-full bg-emerald-500/80 dark:bg-emerald-400/80"
                    style={{ height: `${height}%` }}
                  />
                )
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {copy.transcript}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[0.35fr_0.65fr]">
            <div className="rounded-2xl bg-zinc-950 p-4 text-white dark:bg-white dark:text-zinc-950">
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                {copy.scoreLabel}
              </div>
              <div className="mt-3 text-4xl font-semibold">{copy.score}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <div className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {copy.feedbackTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
                {copy.feedback}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {copy.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-300"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureIcon({ icons, index }: { icons: LucideIcon[]; index: number }) {
  const Icon = icons[index % icons.length];
  return <Icon className="size-5" />;
}

export function AitalkLanding({ copy }: { copy: AitalkLandingCopy }) {
  return (
    <main className="min-h-screen bg-[#f7f8f4] text-zinc-950 antialiased dark:bg-zinc-950 dark:text-white">
      <section className="relative overflow-hidden border-b border-zinc-200 pt-24 dark:border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(16,185,129,0.16),transparent_30%),linear-gradient(to_right,rgba(24,24,27,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.045)_1px,transparent_1px)] bg-[size:auto,44px_44px,44px_44px] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(52,211,153,0.12),transparent_30%),linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)]" />
        <div className="relative container grid min-h-[calc(100dvh-4.5rem)] items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              {copy.hero.eyebrow}
            </div>
            <h1 className="mt-6 max-w-[12ch] text-5xl leading-[1.02] font-semibold text-zinc-950 sm:text-6xl lg:text-7xl dark:text-white">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
              {copy.hero.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-zinc-900/15 transition hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {copy.hero.primaryCta}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/lessons"
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold whitespace-nowrap text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-50 active:translate-y-0 dark:border-white/15 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                {copy.hero.secondaryCta}
              </Link>
            </div>
          </div>

          <PracticePanel copy={copy.hero.panel} />
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-white py-8 dark:border-white/10 dark:bg-zinc-900/40">
        <div className="container grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.stats.map((stat) => (
            <div key={stat.label} className="px-1 py-2">
              <div className="text-3xl font-semibold text-zinc-950 dark:text-white">
                {stat.value}
              </div>
              <div className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold text-zinc-950 md:text-5xl dark:text-white">
              {copy.features.title}
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-300">
              {copy.features.description}
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {copy.features.cards.map((card, index) => (
              <div
                key={card.title}
                className={
                  index === 0
                    ? 'rounded-3xl bg-zinc-950 p-6 text-white shadow-xl shadow-zinc-900/15 lg:col-span-2 dark:bg-white dark:text-zinc-950'
                    : index === 1
                      ? 'rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100'
                      : 'rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm shadow-zinc-900/5 dark:border-white/10 dark:bg-zinc-900 dark:text-white'
                }
              >
                <div
                  className={
                    index === 0
                      ? 'flex size-11 items-center justify-center rounded-2xl bg-emerald-400 text-zinc-950'
                      : 'flex size-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                  }
                >
                  <FeatureIcon icons={featureIcons} index={index} />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{card.title}</h3>
                <p
                  className={
                    index === 0
                      ? 'mt-3 max-w-xl text-sm leading-6 text-zinc-300 dark:text-zinc-600'
                      : 'mt-3 text-sm leading-6 opacity-80'
                  }
                >
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="practice"
        className="border-y border-zinc-200 bg-white py-20 md:py-28 dark:border-white/10 dark:bg-zinc-900/40"
      >
        <div className="container grid gap-10 lg:grid-cols-[0.45fr_0.55fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-zinc-950 md:text-5xl dark:text-white">
              {copy.workflow.title}
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-300">
              {copy.workflow.description}
            </p>
          </div>

          <div className="grid gap-4">
            {copy.workflow.items.map((item, index) => (
              <div
                key={item.title}
                className="grid gap-4 rounded-3xl border border-zinc-200 bg-[#f7f8f4] p-5 sm:grid-cols-[auto_1fr] dark:border-white/10 dark:bg-zinc-950"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <FeatureIcon icons={workflowIcons} index={index} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sync" className="py-20 md:py-28">
        <div className="container grid gap-10 lg:grid-cols-[0.58fr_0.42fr] lg:items-center">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl shadow-zinc-900/8 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/20">
            <div className="rounded-2xl bg-[#f7f8f4] p-5 dark:bg-zinc-950">
              <div className="flex flex-wrap gap-3">
                {copy.sync.providers.map((provider) => (
                  <span
                    key={provider}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {provider}
                  </span>
                ))}
              </div>
              <div className="mt-8 space-y-3">
                {copy.sync.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="flex gap-3 rounded-2xl bg-white p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-semibold text-zinc-950 md:text-5xl dark:text-white">
              {copy.sync.title}
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-300">
              {copy.sync.description}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white py-16 dark:border-white/10 dark:bg-zinc-900/40">
        <div className="container">
          <div className="rounded-3xl bg-zinc-950 p-8 text-white shadow-2xl shadow-zinc-900/20 md:p-10 dark:bg-white dark:text-zinc-950">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="max-w-2xl text-3xl font-semibold md:text-5xl">
                  {copy.cta.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 dark:text-zinc-600">
                  {copy.cta.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 text-sm font-semibold whitespace-nowrap text-zinc-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0"
                >
                  {copy.cta.primaryCta}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/app"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold whitespace-nowrap text-white transition hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 dark:border-zinc-300 dark:text-zinc-950 dark:hover:bg-zinc-100"
                >
                  {copy.cta.secondaryCta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
