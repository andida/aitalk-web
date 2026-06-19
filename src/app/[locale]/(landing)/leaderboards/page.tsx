import {
  LeaderboardsPage,
  type LeaderboardsPageCopy,
} from '@/features/siterise/leaderboards-page';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import {
  getLeaderboardView,
  type LeaderboardView,
  type SiteRiseLeaderboardKind,
} from '@/shared/models/siterise';
import { getUserInfo } from '@/shared/models/user';

export const revalidate = 300;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.leaderboards.metadata',
  canonicalUrl: '/leaderboards',
});

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('pages.leaderboards');
  const copy = t.raw('page') as LeaderboardsPageCopy;
  const kind = parseKind(getFirst(query.kind));
  const category = parseOptional(getFirst(query.category));
  const country = parseCountry(getFirst(query.country));
  const range = parseRange(getFirst(query.range));
  const user = await getOptionalUser();
  const leaderboard = await getSafeLeaderboardView({
    kind,
    category,
    country,
    rangeDays: range,
    isAuthenticated: Boolean(user),
  });

  return (
    <LeaderboardsPage
      copy={copy}
      leaderboard={leaderboard}
      kind={kind}
      category={category}
      country={country}
      range={range}
    />
  );
}

function parseKind(value?: string): SiteRiseLeaderboardKind {
  return value === 'new' ? 'new' : 'growth';
}

function parseRange(value?: string) {
  const range = Number(value || 30);
  return [30, 60, 90].includes(range) ? range : 30;
}

function parseCountry(value?: string) {
  const country = String(value || '').trim();
  if (!country || country.toLowerCase() === 'global') return 'global';
  return /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : 'global';
}

function parseOptional(value?: string) {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
}

function getFirst(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getOptionalUser() {
  try {
    return await getUserInfo();
  } catch {
    return null;
  }
}

async function getSafeLeaderboardView({
  kind,
  category,
  country,
  rangeDays,
  isAuthenticated,
}: {
  kind: SiteRiseLeaderboardKind;
  category?: string;
  country: string;
  rangeDays: number;
  isAuthenticated: boolean;
}): Promise<LeaderboardView> {
  try {
    return await getLeaderboardView({
      kind,
      category,
      country,
      rangeDays,
      isAuthenticated,
    });
  } catch (error) {
    console.error('load leaderboard failed:', error);
    return {
      kind,
      month: getCurrentMonthStart(),
      country,
      category: category || null,
      range: kind === 'new' ? rangeDays : null,
      limit: isAuthenticated ? 100 : 20,
      isPreview: !isAuthenticated,
      generatedAt: null,
      entries: [],
    };
  }
}

function getCurrentMonthStart() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}-01`;
}
