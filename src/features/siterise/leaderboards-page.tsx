import { ArrowUpRight, LockKeyhole, Search, TrendingUp } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';
import type {
  LeaderboardEntryView,
  LeaderboardView,
  SiteRiseLeaderboardKind,
} from '@/shared/models/siterise';

export type LeaderboardsPageCopy = {
  title: string;
  description: string;
  tabs: {
    growth: string;
    new: string;
  };
  filters: {
    category: string;
    categoryPlaceholder: string;
    country: string;
    countryPlaceholder: string;
    range: string;
    range30: string;
    range60: string;
    range90: string;
    limit: string;
  };
  columns: {
    rank: string;
    domain: string;
    category: string;
    visits: string;
    growth: string;
    signal: string;
    registered: string;
    trend: string;
  };
  empty: {
    title: string;
    description: string;
    command: string;
  };
  previewNotice: string;
  signin: string;
  updated: string;
  viewDomain: string;
};

export function LeaderboardsPage({
  copy,
  leaderboard,
  kind,
  category,
  country,
  range,
}: {
  copy: LeaderboardsPageCopy;
  leaderboard: LeaderboardView;
  kind: SiteRiseLeaderboardKind;
  category?: string;
  country: string;
  range: number;
}) {
  const hasRows = leaderboard.entries.length > 0;

  return (
    <main className="min-h-[100dvh] bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200 bg-white/80 pt-24 pb-10 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl leading-tight font-semibold tracking-normal sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              {copy.description}
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabLink
                href={buildLeaderboardHref({
                  kind: 'growth',
                  category,
                  country,
                })}
                active={kind === 'growth'}
              >
                <TrendingUp className="size-4" />
                {copy.tabs.growth}
              </TabLink>
              <TabLink
                href={buildLeaderboardHref({
                  kind: 'new',
                  category,
                  country,
                  range,
                })}
                active={kind === 'new'}
              >
                <Search className="size-4" />
                {copy.tabs.new}
              </TabLink>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FilterLink
                label={copy.filters.category}
                value={category || copy.filters.categoryPlaceholder}
                href={buildLeaderboardHref({ kind, country, range })}
              />
              <FilterLink
                label={copy.filters.country}
                value={country || copy.filters.countryPlaceholder}
                href={buildLeaderboardHref({ kind, category, range })}
              />
              <RangeLinks
                copy={copy}
                kind={kind}
                category={category}
                country={country}
                range={range}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {leaderboard.generatedAt ? (
              <>
                {copy.updated}:{' '}
                <time dateTime={leaderboard.generatedAt}>
                  {formatDateTime(leaderboard.generatedAt)}
                </time>
              </>
            ) : (
              copy.empty.title
            )}
          </div>
          {leaderboard.isPreview ? (
            <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <LockKeyhole className="size-4" />
              <span>{copy.previewNotice}</span>
              <Button asChild size="sm" variant="outline">
                <Link href="/sign-in">{copy.signin}</Link>
              </Button>
            </div>
          ) : null}
        </div>

        {hasRows ? (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900">
                  <TableHead className="w-16 px-4">
                    {copy.columns.rank}
                  </TableHead>
                  <TableHead>{copy.columns.domain}</TableHead>
                  <TableHead>{copy.columns.category}</TableHead>
                  <TableHead className="text-right">
                    {copy.columns.visits}
                  </TableHead>
                  <TableHead className="text-right">
                    {copy.columns.growth}
                  </TableHead>
                  <TableHead>{copy.columns.signal}</TableHead>
                  <TableHead>{copy.columns.registered}</TableHead>
                  <TableHead>{copy.columns.trend}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.entries.map((entry) => (
                  <LeaderboardRow
                    key={`${entry.rank}-${entry.rootDomain}`}
                    entry={entry}
                    copy={copy}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold">{copy.empty.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {copy.empty.description}
            </p>
            <code className="mt-5 block w-fit rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {copy.empty.command}
            </code>
          </div>
        )}
      </section>
    </main>
  );
}

function LeaderboardRow({
  entry,
  copy,
}: {
  entry: LeaderboardEntryView;
  copy: LeaderboardsPageCopy;
}) {
  return (
    <TableRow>
      <TableCell className="px-4 font-mono text-sm text-zinc-500">
        {entry.rank}
      </TableCell>
      <TableCell>
        <Link
          href={`/domains/${entry.rootDomain}`}
          className="group inline-flex items-center gap-2 font-medium text-zinc-950 hover:text-emerald-700 dark:text-zinc-50 dark:hover:text-emerald-300"
          aria-label={`${copy.viewDomain}: ${entry.rootDomain}`}
        >
          {entry.rootDomain}
          <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </TableCell>
      <TableCell>
        {entry.category ? (
          <Badge variant="outline" className="rounded-md">
            {entry.category}
          </Badge>
        ) : (
          <span className="text-zinc-400">-</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatNumber(entry.visits)}
      </TableCell>
      <TableCell
        className={cn(
          'text-right font-mono',
          entry.growthRate && entry.growthRate > 0
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-zinc-500'
        )}
      >
        {formatPercent(entry.growthRate)}
      </TableCell>
      <TableCell className="max-w-[220px] truncate text-zinc-600 dark:text-zinc-300">
        {entry.signal || '-'}
      </TableCell>
      <TableCell className="text-zinc-600 dark:text-zinc-300">
        {entry.registeredAt || '-'}
      </TableCell>
      <TableCell>
        <MiniTrend values={entry.monthlyTrend.map((point) => point.visits)} />
      </TableCell>
    </TableRow>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      asChild
      variant={active ? 'default' : 'outline'}
      className="rounded-md"
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function FilterLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <span className="block text-xs text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </Link>
  );
}

function RangeLinks({
  copy,
  kind,
  category,
  country,
  range,
}: {
  copy: LeaderboardsPageCopy;
  kind: SiteRiseLeaderboardKind;
  category?: string;
  country: string;
  range: number;
}) {
  const ranges = [
    { value: 30, label: copy.filters.range30 },
    { value: 60, label: copy.filters.range60 },
    { value: 90, label: copy.filters.range90 },
  ];

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="px-2 text-xs text-zinc-500">{copy.filters.range}</span>
      <div className="mt-1 flex gap-1">
        {ranges.map((item) => (
          <Link
            key={item.value}
            href={buildLeaderboardHref({
              kind,
              category,
              country,
              range: item.value,
            })}
            className={cn(
              'rounded px-2 py-1 text-xs font-medium',
              range === item.value
                ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniTrend({ values }: { values: Array<number | null> }) {
  const filtered = values.filter(
    (value): value is number => typeof value === 'number'
  );
  if (filtered.length === 0) return <span className="text-zinc-400">-</span>;
  const max = Math.max(...filtered, 1);

  return (
    <div className="flex h-8 w-28 items-end gap-1" aria-hidden="true">
      {values.slice(-10).map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="w-2 rounded-sm bg-emerald-600/70 dark:bg-emerald-400/70"
          style={{
            height: `${Math.max(4, ((value || 0) / max) * 28)}px`,
          }}
        />
      ))}
    </div>
  );
}

function buildLeaderboardHref({
  kind,
  category,
  country,
  range,
}: {
  kind: SiteRiseLeaderboardKind;
  category?: string;
  country?: string;
  range?: number;
}) {
  const params = new URLSearchParams();
  params.set('kind', kind);
  if (category) params.set('category', category);
  if (country && country !== 'global') params.set('country', country);
  if (kind === 'new' && range) params.set('range', String(range));
  return `/leaderboards?${params.toString()}`;
}

function formatNumber(value: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (typeof value !== 'number') return '-';
  return `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}
