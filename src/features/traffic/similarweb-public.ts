import {
  TrafficProviderError,
  type TrafficSummaryMetrics,
  type TrafficSummaryRequest,
  type TrafficSummaryResult,
} from './types';

type SimilarwebPublicResponse = {
  SiteName?: string;
  Description?: string;
  Category?: string;
  SnapshotDate?: string;
  EstimatedMonthlyVisits?: Record<string, number | string | null>;
  Engagments?: {
    Visits?: number | string | null;
    BounceRate?: number | string | null;
    PagePerVisit?: number | string | null;
    TimeOnSite?: number | string | null;
    Month?: number | string | null;
    Year?: number | string | null;
  };
  TrafficSources?: Record<string, number | string | null>;
  GlobalRank?: Record<string, unknown>;
  CountryRank?: Record<string, unknown>;
  GlobalCategoryRank?: Record<string, unknown>;
  CategoryRank?: Record<string, unknown>;
  TopCountryShares?: unknown[];
  TopKeywords?: unknown[];
  Competitors?: unknown;
  LargeScreenshot?: string;
};

const DEFAULT_BASE_URL = 'https://data.similarweb.com/api/v1/data';
const DEFAULT_COUNTRY = 'global';
const DEFAULT_CACHE_TTL_DAYS = 30;

export type SimilarwebPublicTrafficDataset = {
  selected: TrafficSummaryResult;
  snapshots: TrafficSummaryResult[];
};

export async function getSimilarwebPublicTrafficSummary(
  request: TrafficSummaryRequest
): Promise<TrafficSummaryResult> {
  const dataset = await getSimilarwebPublicTrafficDataset(request);
  return dataset.selected;
}

export async function getSimilarwebPublicTrafficDataset(
  request: TrafficSummaryRequest
): Promise<SimilarwebPublicTrafficDataset> {
  const startedAt = Date.now();
  const url = new URL(getBaseUrl());
  url.searchParams.set('domain', request.target);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json,text/plain,*/*',
      },
      cache: 'no-store',
    });

    const text = await response.text();

    if (!response.ok) {
      throw mapProviderError(text, response.status);
    }

    const raw = parseJson(text);
    const snapshots = mapMonthlySnapshots({
      raw,
      request,
      latencyMs: Date.now() - startedAt,
    });

    if (snapshots.length === 0) {
      throw new TrafficProviderError(
        'No public traffic data is available for this domain.',
        'no_data',
        404
      );
    }

    return {
      selected: pickSelectedSnapshot(snapshots, request.displayDate),
      snapshots,
    };
  } catch (error) {
    if (error instanceof TrafficProviderError) {
      throw error;
    }

    throw new TrafficProviderError(
      error instanceof Error
        ? sanitizeProviderMessage(error.message)
        : 'Traffic data request failed.',
      'network_error',
      502
    );
  }
}

function getBaseUrl() {
  return process.env.SIMILARWEB_PUBLIC_BASE_URL || DEFAULT_BASE_URL;
}

function getCacheUntil() {
  const configured = Number(process.env.SIMILARWEB_PUBLIC_CACHE_TTL_DAYS);
  const days = Number.isFinite(configured)
    ? Math.min(Math.max(configured, 1), DEFAULT_CACHE_TTL_DAYS)
    : DEFAULT_CACHE_TTL_DAYS;
  const cacheUntil = new Date();
  cacheUntil.setUTCDate(cacheUntil.getUTCDate() + days);
  return cacheUntil;
}

function parseJson(text: string): SimilarwebPublicResponse {
  try {
    return JSON.parse(text) as SimilarwebPublicResponse;
  } catch {
    throw new TrafficProviderError(
      'Traffic data response is not valid JSON.',
      'invalid_response',
      502
    );
  }
}

function mapMonthlySnapshots({
  raw,
  request,
  latencyMs,
}: {
  raw: SimilarwebPublicResponse;
  request: TrafficSummaryRequest;
  latencyMs: number;
}): TrafficSummaryResult[] {
  const visitsByMonth = raw.EstimatedMonthlyVisits || {};
  const months = Object.keys(visitsByMonth)
    .filter((month) => /^\d{4}-\d{2}-01$/.test(month))
    .sort()
    .reverse();
  const latestMonth = months[0] || normalizeSnapshotDate(raw.SnapshotDate);
  const cacheUntil = getCacheUntil().toISOString();
  const snapshots: TrafficSummaryResult[] = [];

  for (const month of months) {
    const visits = parseNumber(visitsByMonth[month]);
    if (visits === null) continue;

    snapshots.push({
      domain: normalizeDomain(raw.SiteName || request.target),
      country: normalizeCountry(request.country),
      month,
      source: 'similarweb_public',
      cached: false,
      cachedUntil: cacheUntil,
      metrics: mapMetrics(raw, visits, month === latestMonth),
      raw: {
        provider: 'similarweb_public',
        latencyMs,
        requestedDomain: request.target,
        month,
        monthVisits: visits,
        fullResponse: raw,
      },
    });
  }

  return snapshots;
}

function pickSelectedSnapshot(
  snapshots: TrafficSummaryResult[],
  requestedMonth?: string
) {
  if (requestedMonth) {
    const requested = snapshots.find(
      (snapshot) => snapshot.month === requestedMonth
    );
    if (requested) return requested;
  }

  return snapshots[0];
}

function mapMetrics(
  raw: SimilarwebPublicResponse,
  visits: number,
  includeEngagement: boolean
): TrafficSummaryMetrics {
  return {
    visits,
    users: null,
    desktopVisits: null,
    mobileVisits: null,
    bounceRate: includeEngagement
      ? parseNumber(raw.Engagments?.BounceRate)
      : null,
    pagesPerVisit: includeEngagement
      ? parseNumber(raw.Engagments?.PagePerVisit)
      : null,
    timeOnSite: includeEngagement
      ? parseTimeOnSite(raw.Engagments?.TimeOnSite)
      : null,
    accuracy: 'public-estimate',
  };
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .replace(/^www\./, '')
    .toLowerCase();
}

function normalizeCountry(country?: string) {
  const value = String(country || '').trim();
  if (!value || value.toLowerCase() === DEFAULT_COUNTRY) return DEFAULT_COUNTRY;
  return value.toUpperCase();
}

function normalizeSnapshotDate(value?: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return `${parsed.getUTCFullYear()}-${String(
    parsed.getUTCMonth() + 1
  ).padStart(2, '0')}-01`;
}

function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimeOnSite(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value) return null;

  const text = value.trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);

  const parts = text.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];

  return null;
}

function mapProviderError(text: string, status: number) {
  if (status === 403) {
    return new TrafficProviderError(
      'Traffic data is temporarily unavailable.',
      'provider_forbidden',
      403
    );
  }

  if (status === 429) {
    return new TrafficProviderError(
      'Traffic data source is rate limited.',
      'rate_limited',
      429
    );
  }

  return new TrafficProviderError(
    sanitizeProviderMessage(
      text.trim() || `Traffic data request failed with status ${status}.`
    ),
    'provider_error',
    status
  );
}

function sanitizeProviderMessage(message: string) {
  return message
    .replace(/Similarweb public/gi, 'Traffic data')
    .replace(/Similarweb/gi, 'Traffic data provider');
}
