import { ArrowLeft, LockKeyhole } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { DomainDetailView } from '@/shared/models/siterise';

export type DomainDetailCopy = {
  back: string;
  notFoundTitle: string;
  notFoundDescription: string;
  monthlyVisits: string;
  growth: string;
  category: string;
  registered: string;
  firstSeen: string;
  status: string;
  trendTitle: string;
  leaderboardTitle: string;
  previewNotice: string;
  signin: string;
  emptyTrend: string;
  emptyLeaderboards: string;
};

export function DomainDetailPage({
  copy,
  detail,
}: {
  copy: DomainDetailCopy;
  detail: DomainDetailView | null;
}) {
  if (!detail) {
    return (
      <main className="min-h-[100dvh] bg-zinc-50 px-4 pt-28 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <section className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-3xl font-semibold">{copy.notFoundTitle}</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            {copy.notFoundDescription}
          </p>
          <Button asChild className="mt-6">
            <Link href="/leaderboards">{copy.back}</Link>
          </Button>
        </section>
      </main>
    );
  }

  const latest = detail.monthlyTrend[detail.monthlyTrend.length - 1];

  return (
    <main className="min-h-[100dvh] bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200 bg-white pt-24 pb-10 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="mb-6 -ml-3">
            <Link href="/leaderboards">
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl leading-tight font-semibold tracking-normal sm:text-5xl">
                  {detail.rootDomain}
                </h1>
                {detail.category ? (
                  <Badge variant="outline" className="rounded-md">
                    {detail.category}
                  </Badge>
                ) : null}
              </div>
              {detail.description ? (
                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                  {detail.description}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric
                label={copy.monthlyVisits}
                value={formatNumber(latest?.visits)}
              />
              <Metric
                label={copy.growth}
                value={formatPercent(detail.growthRate)}
              />
              <Metric
                label={copy.registered}
                value={detail.registeredAt || '-'}
              />
              <Metric label={copy.status} value={detail.status} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold">{copy.trendTitle}</h2>
          {detail.monthlyTrend.length > 0 ? (
            <div className="mt-6">
              <LargeTrend values={detail.monthlyTrend} />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {detail.monthlyTrend.map((point) => (
                  <div
                    key={point.month}
                    className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
                  >
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {point.month}
                    </span>
                    <span className="font-mono">
                      {formatNumber(point.visits)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              {copy.emptyTrend}
            </p>
          )}
        </div>

        <aside className="space-y-6">
          {detail.isPreview ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex gap-3">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                <p className="text-zinc-600 dark:text-zinc-300">
                  {copy.previewNotice}
                </p>
              </div>
              <Button asChild className="mt-4 w-full">
                <Link href="/sign-in">{copy.signin}</Link>
              </Button>
            </div>
          ) : null}

          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">{copy.leaderboardTitle}</h2>
            {detail.leaderboardEntries.length > 0 ? (
              <div className="mt-4 space-y-3">
                {detail.leaderboardEntries.map((entry) => (
                  <div
                    key={`${entry.kind}-${entry.month}-${entry.rank}`}
                    className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {entry.kind}
                      </span>
                      <span className="font-mono">#{entry.rank}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                      <span>{entry.month}</span>
                      <span>{formatPercent(entry.growthRate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                {copy.emptyLeaderboards}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Info label={copy.category} value={detail.category || '-'} />
            <Info label={copy.firstSeen} value={detail.firstSeenAt || '-'} />
            <Info label={copy.registered} value={detail.registeredAt || '-'} />
          </div>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-2 font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LargeTrend({
  values,
}: {
  values: Array<{ month: string; visits: number | null }>;
}) {
  const numeric = values
    .map((point) => point.visits)
    .filter((value): value is number => typeof value === 'number');
  const max = Math.max(...numeric, 1);

  return (
    <div className="flex h-56 items-end gap-2 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
      {values.map((point) => (
        <div
          key={point.month}
          className="flex min-w-8 flex-1 flex-col items-center gap-2"
        >
          <div
            className="w-full rounded-t-md bg-emerald-600/80 dark:bg-emerald-400/80"
            style={{
              height: `${Math.max(8, ((point.visits || 0) / max) * 184)}px`,
            }}
          />
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {point.month.slice(5, 7)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;
}
