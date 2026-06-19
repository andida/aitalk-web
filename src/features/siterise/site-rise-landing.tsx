import type { ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Database,
  Filter,
  Globe2,
  Lock,
  Radar,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

import { TrafficLookupDemo } from './traffic-lookup-demo';

export type SiteRiseLandingCopy = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    inputLabel: string;
    inputPlaceholder: string;
    country: string;
    cta: string;
    loading: string;
    errorFallback: string;
    cachedLabel: string;
    cacheUntilLabel: string;
    pills: string[];
    preview: {
      domain: string;
      meta: string;
      growth: string;
      metrics: { label: string; value: string; detail: string }[];
      sourceTitle: string;
      sourceSubtitle: string;
      updated: string;
      sources: { label: string; value: string }[];
    };
  };
  stats: { value: string; label: string }[];
  features: {
    eyebrow: string;
    title: string;
    description: string;
    cards: { title: string; text: string }[];
  };
  leaderboards: {
    eyebrow: string;
    title: string;
    description: string;
    pills: string[];
    tableTitle: string;
    tableSubtitle: string;
    filter: string;
    columns: {
      rank: string;
      domain: string;
      visits: string;
      growth: string;
      signal: string;
      score: string;
    };
    rows: {
      rank: string;
      domain: string;
      category: string;
      visits: string;
      growth: string;
      signal: string;
      score: string;
    }[];
  };
  watchlist: {
    eyebrow: string;
    title: string;
    description: string;
    cards: string[];
    panelTitle: string;
    panelSubtitle: string;
    addButton: string;
    monthlyVisitsLabel: string;
    rows: {
      domain: string;
      visits: string;
      change: string;
      alert: string;
    }[];
    triggeredAlert: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    description: string;
    monthSuffix: string;
    recommended: string;
    freeCta: string;
    paidCta: string;
    plans: {
      name: string;
      price: string;
      description: string;
      featured?: boolean;
      features: string[];
    }[];
  };
  compliance: {
    title: string;
    description: string;
    cta: string;
  };
};

const featureIcons = [Radar, TrendingUp, Bell];
const complianceIcons = [ShieldCheck, Database, Globe2, Lock];

function Pill({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm shadow-zinc-900/5 ${className}`}
    >
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-xs font-semibold text-emerald-700">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold text-zinc-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-600">{description}</p>
    </div>
  );
}

function IconByIndex({
  icons,
  index,
  className,
}: {
  icons: LucideIcon[];
  index: number;
  className?: string;
}) {
  const Icon = icons[index % icons.length];
  return <Icon className={className} />;
}

export function SiteRiseLanding({ copy }: { copy: SiteRiseLandingCopy }) {
  return (
    <main className="min-h-screen bg-[#f5f7f2] font-sans text-zinc-950 antialiased">
      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-[#fafbf7] pt-16 md:pt-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(39,39,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,0.045)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f5f7f2] to-transparent" />

        <div className="relative container flex min-h-[calc(100dvh-12rem)] items-center py-10 md:py-14">
          <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
            <div className="max-w-2xl">
              <Pill className="border-emerald-200 bg-emerald-50/90 text-emerald-900">
                {copy.hero.eyebrow}
              </Pill>
              <h1 className="mt-6 max-w-[16ch] text-5xl leading-[0.98] font-semibold text-zinc-950 sm:text-6xl lg:text-[4.75rem] xl:text-[5.25rem]">
                {copy.hero.title}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-7 text-zinc-600">
                {copy.hero.description}
              </p>
            </div>

            <div className="lg:pt-8">
              <TrafficLookupDemo copy={copy.hero} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-white py-8">
        <div className="container grid gap-4 md:grid-cols-4">
          {copy.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-zinc-200 bg-[#fbfcfa] p-4"
            >
              <div className="font-mono text-3xl font-semibold text-zinc-950">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-20 md:py-28">
        <div className="container">
          <SectionHeading
            eyebrow={copy.features.eyebrow}
            title={copy.features.title}
            description={copy.features.description}
          />

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {copy.features.cards.map((card, index) => (
              <div
                key={card.title}
                className={`rounded-lg border border-zinc-200 p-5 shadow-sm shadow-zinc-900/5 ${
                  index === 0
                    ? 'bg-zinc-950 text-white md:col-span-2'
                    : 'bg-white text-zinc-950'
                }`}
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-md ${
                    index === 0
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <IconByIndex
                    icons={featureIcons}
                    index={index}
                    className="size-5"
                  />
                </div>
                <h3
                  className={`mt-5 text-lg font-semibold ${
                    index === 0 ? 'text-white' : 'text-zinc-950'
                  }`}
                >
                  {card.title}
                </h3>
                <p
                  className={`mt-3 text-sm leading-6 ${
                    index === 0 ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                >
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="leaderboards"
        className="border-y border-zinc-200 bg-white py-20 md:py-28"
      >
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.38fr_0.62fr] lg:items-start">
            <div>
              <Pill className="gap-2">
                <BarChart3 className="size-4 text-emerald-700" />
                {copy.leaderboards.eyebrow}
              </Pill>
              <h2 className="mt-5 text-4xl font-semibold text-zinc-950 md:text-5xl">
                {copy.leaderboards.title}
              </h2>
              <p className="mt-5 text-base leading-7 text-zinc-600">
                {copy.leaderboards.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {copy.leaderboards.pills.map((pill) => (
                  <Pill key={pill}>{pill}</Pill>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-[#fbfcfa] shadow-xl shadow-zinc-900/8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-950">
                    {copy.leaderboards.tableTitle}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {copy.leaderboards.tableSubtitle}
                  </div>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700">
                  <Filter className="size-4" />
                  {copy.leaderboards.filter}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">
                        {copy.leaderboards.columns.rank}
                      </th>
                      <th className="px-5 py-3 font-medium">
                        {copy.leaderboards.columns.domain}
                      </th>
                      <th className="px-5 py-3 font-medium">
                        {copy.leaderboards.columns.visits}
                      </th>
                      <th className="px-5 py-3 font-medium">
                        {copy.leaderboards.columns.growth}
                      </th>
                      <th className="px-5 py-3 font-medium">
                        {copy.leaderboards.columns.signal}
                      </th>
                      <th className="px-5 py-3 font-medium">
                        {copy.leaderboards.columns.score}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {copy.leaderboards.rows.map((row) => (
                      <tr key={row.domain} className="bg-white/70">
                        <td className="px-5 py-4 font-mono text-xs text-zinc-500">
                          {row.rank}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-950">
                            {row.domain}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {row.category}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-zinc-900">
                          {row.visits}
                        </td>
                        <td className="px-5 py-4 text-emerald-700">
                          {row.growth}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {row.signal}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold text-white">
                            {row.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="watchlist"
        className="border-y border-zinc-200 bg-white py-20 md:py-28"
      >
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.44fr_0.56fr] lg:items-center">
            <div>
              <Pill className="gap-2">
                <Bell className="size-4 text-emerald-700" />
                {copy.watchlist.eyebrow}
              </Pill>
              <h2 className="mt-5 text-4xl font-semibold text-zinc-950 md:text-5xl">
                {copy.watchlist.title}
              </h2>
              <p className="mt-5 text-base leading-7 text-zinc-600">
                {copy.watchlist.description}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {copy.watchlist.cards.map((card, index) => (
                  <div
                    key={card}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-[#fbfcfa] p-4"
                  >
                    <IconByIndex
                      icons={complianceIcons}
                      index={index}
                      className="size-5 text-emerald-700"
                    />
                    <span className="text-sm font-medium text-zinc-800">
                      {card}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-[#fbfcfa] p-4 shadow-xl shadow-zinc-900/8">
              <div className="rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">
                      {copy.watchlist.panelTitle}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {copy.watchlist.panelSubtitle}
                    </div>
                  </div>
                  <button className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white">
                    {copy.watchlist.addButton}
                  </button>
                </div>
                <div className="divide-y divide-zinc-200">
                  {copy.watchlist.rows.map((row) => (
                    <div
                      key={row.domain}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4"
                    >
                      <div>
                        <div className="text-sm font-medium text-zinc-950">
                          {row.domain}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {row.visits} {copy.watchlist.monthlyVisitsLabel}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">
                        {row.change}
                      </div>
                      <Pill
                        className={
                          row.alert === copy.watchlist.triggeredAlert
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : ''
                        }
                      >
                        {row.alert}
                      </Pill>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 md:py-28">
        <div className="container">
          <SectionHeading
            eyebrow={copy.pricing.eyebrow}
            title={copy.pricing.title}
            description={copy.pricing.description}
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {copy.pricing.plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 shadow-sm ${
                  plan.featured
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-xl shadow-zinc-900/15'
                    : 'border-zinc-200 bg-white text-zinc-950 shadow-zinc-900/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {plan.featured && (
                    <span className="rounded-md bg-emerald-400 px-3 py-1 text-xs font-semibold text-zinc-950">
                      {copy.pricing.recommended}
                    </span>
                  )}
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-5xl font-semibold">{plan.price}</span>
                  <span
                    className={
                      plan.featured ? 'text-zinc-300' : 'text-zinc-500'
                    }
                  >
                    {copy.pricing.monthSuffix}
                  </span>
                </div>
                <p
                  className={`mt-4 text-sm leading-6 ${
                    plan.featured ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm">
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${
                          plan.featured
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                        }`}
                      />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  className={`mt-8 h-11 w-full rounded-md text-sm font-semibold ${
                    plan.featured
                      ? 'bg-white text-zinc-950'
                      : 'border border-zinc-200 bg-white text-zinc-950'
                  }`}
                >
                  {plan.name === copy.pricing.plans[0]?.name
                    ? copy.pricing.freeCta
                    : copy.pricing.paidCta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white py-16">
        <div className="container">
          <div className="rounded-lg border border-zinc-200 bg-[#fbfcfa] p-6 md:flex md:items-center md:justify-between md:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950">
                {copy.compliance.title}
              </h2>
              {copy.compliance.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  {copy.compliance.description}
                </p>
              ) : null}
            </div>
            <Link
              href="/pricing"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white md:mt-0"
            >
              {copy.compliance.cta}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
