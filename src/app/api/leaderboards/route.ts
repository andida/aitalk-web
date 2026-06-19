import {
  getLeaderboardView,
  type SiteRiseLeaderboardKind,
} from '@/shared/models/siterise';
import { getUserInfo } from '@/shared/models/user';

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = parseKind(url.searchParams.get('kind'));
    const range = parseRange(url.searchParams.get('range'));
    const limit = parseLimit(url.searchParams.get('limit'));
    const user = await getOptionalUser();

    const data = await getLeaderboardView({
      kind,
      displayDate: parseMonth(url.searchParams.get('month')),
      category: parseOptional(url.searchParams.get('category')),
      country: parseCountry(url.searchParams.get('country')),
      rangeDays: range,
      limit,
      isAuthenticated: Boolean(user),
    });

    return json({
      code: 0,
      message: 'ok',
      data,
    });
  } catch (error) {
    return json(
      {
        code: -1,
        message:
          error instanceof Error
            ? error.message
            : 'Leaderboard request failed.',
        error: 'invalid_request',
      },
      400
    );
  }
}

function parseKind(value: string | null): SiteRiseLeaderboardKind {
  if (!value || value === 'growth') return 'growth';
  if (value === 'new') return 'new';
  throw new Error('kind must be growth or new.');
}

function parseRange(value: string | null) {
  if (!value) return 30;
  const range = Number(value);
  if (![30, 60, 90].includes(range)) {
    throw new Error('range must be 30, 60, or 90.');
  }
  return range;
}

function parseLimit(value: string | null) {
  if (!value) return undefined;
  const limit = Number(value);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('limit must be a positive number.');
  }
  return Math.floor(limit);
}

function parseMonth(value: string | null) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-01$/.test(value)) {
    throw new Error('month must use YYYY-MM-01 format.');
  }
  return value;
}

function parseCountry(value: string | null) {
  const country = String(value || '').trim();
  if (!country || country.toLowerCase() === 'global') return 'global';
  if (!/^[a-z]{2}$/i.test(country)) {
    throw new Error('country must be global or a two-letter code.');
  }
  return country.toUpperCase();
}

function parseOptional(value: string | null) {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
}

async function getOptionalUser() {
  try {
    return await getUserInfo();
  } catch {
    return null;
  }
}
