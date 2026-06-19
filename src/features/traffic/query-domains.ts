import {
  TrafficProviderError,
  type TrafficSummaryMetrics,
  type TrafficSummaryRequest,
  type TrafficSummaryResult,
} from './types';

type QueryDomainsTrafficResponse = {
  error?: number;
  status?: string;
  note?: string;
  data?: {
    domain?: string;
    traffic?: Record<string, number | string | null>;
  };
};

export type QueryDomainsTrafficDataset = {
  selected: TrafficSummaryResult;
  snapshots: TrafficSummaryResult[];
};

const DEFAULT_BASE_URL = 'https://api.query.domains/api/v1/traffic';
const DEFAULT_COUNTRY = 'global';
const DEFAULT_CACHE_TTL_DAYS = 30;

export async function getQueryDomainsTrafficDataset(
  request: TrafficSummaryRequest
): Promise<QueryDomainsTrafficDataset> {
  const apiKey = process.env.QUERY_DOMAINS_API_KEY;
  if (!apiKey) {
    throw new TrafficProviderError(
      'Traffic data is temporarily unavailable.',
      'provider_not_configured',
      503
    );
  }

  const startedAt = Date.now();
  const url = `${getBaseUrl()}/${encodeURIComponent(request.target)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json,text/plain,*/*',
        authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });

    const text = await response.text();
    if (!response.ok) {
      throw mapProviderError(response.status);
    }

    const raw = parseJson(text);
    if (raw.error && raw.error !== 0) {
      throw new TrafficProviderError(
        'Traffic data is temporarily unavailable.',
        'provider_error',
        502
      );
    }

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
      'Traffic data is temporarily unavailable.',
      'network_error',
      502
    );
  }
}

function getBaseUrl() {
  return (
    process.env.QUERY_DOMAINS_TRAFFIC_BASE_URL || DEFAULT_BASE_URL
  ).replace(/\/$/, '');
}

function getCacheUntil() {
  const configured = Number(process.env.QUERY_DOMAINS_CACHE_TTL_DAYS);
  const days = Number.isFinite(configured)
    ? Math.min(Math.max(configured, 1), DEFAULT_CACHE_TTL_DAYS)
    : DEFAULT_CACHE_TTL_DAYS;
  const cacheUntil = new Date();
  cacheUntil.setUTCDate(cacheUntil.getUTCDate() + days);
  return cacheUntil;
}

function parseJson(text: string): QueryDomainsTrafficResponse {
  try {
    return JSON.parse(text) as QueryDomainsTrafficResponse;
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
  raw: QueryDomainsTrafficResponse;
  request: TrafficSummaryRequest;
  latencyMs: number;
}): TrafficSummaryResult[] {
  const trafficByMonth = raw.data?.traffic || {};
  const months = Object.keys(trafficByMonth)
    .filter((month) => /^\d{4}-\d{2}-01$/.test(month))
    .sort()
    .reverse();
  const cacheUntil = getCacheUntil().toISOString();
  const snapshots: TrafficSummaryResult[] = [];

  for (const month of months) {
    const visits = parseNumber(trafficByMonth[month]);
    if (visits === null) continue;

    snapshots.push({
      domain: normalizeDomain(raw.data?.domain || request.target),
      country: normalizeCountry(request.country),
      month,
      source: 'query_domains',
      cached: false,
      cachedUntil: cacheUntil,
      metrics: mapMetrics(visits),
      raw: {
        provider: 'query_domains',
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

function mapMetrics(visits: number): TrafficSummaryMetrics {
  return {
    visits,
    users: null,
    desktopVisits: null,
    mobileVisits: null,
    bounceRate: null,
    pagesPerVisit: null,
    timeOnSite: null,
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

function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function mapProviderError(status: number) {
  if (status === 401 || status === 403) {
    return new TrafficProviderError(
      'Traffic data is temporarily unavailable.',
      'provider_forbidden',
      503
    );
  }

  if (status === 404) {
    return new TrafficProviderError(
      'No public traffic data is available for this domain.',
      'no_data',
      404
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
    'Traffic data is temporarily unavailable.',
    'provider_error',
    status
  );
}
