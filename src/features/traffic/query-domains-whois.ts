import { TrafficProviderError } from './types';

type QueryDomainsWhoisResponse = {
  prices?: unknown[];
  type?: number;
  parsed?: {
    id?: string;
    registrar?: string;
    registered?: string;
    d_updated?: string;
    expires?: string;
    nameservers?: string;
    status?: string;
    name?: string;
    suffix?: string;
    created?: string;
    type?: number;
  };
  raw?: string;
};

type QueryDomainsCheckResponse = {
  error?: number;
  data?: {
    domains?: Array<{
      domain?: string;
      status?: string;
      registered?: string | null;
      expires?: string | null;
    }>;
    summary?: {
      total?: number;
      available?: number;
      registered?: number;
    };
    duration?: number;
  };
};

export type QueryDomainsWhoisResult = {
  domain: string;
  registeredAt: Date | null;
  registrar: string | null;
  expiresAt: Date | null;
  updatedAt: Date | null;
  status: string | null;
  nameservers: string | null;
  raw: QueryDomainsWhoisResponse;
};

export type QueryDomainsCheckResult = {
  domain: string;
  registeredAt: Date | null;
  expiresAt: Date | null;
  status: string | null;
  raw: Record<string, unknown>;
};

const DEFAULT_WHOIS_URL = 'https://api.query.domains/api/v1/whois';
const DEFAULT_CHECK_URL = 'https://api.query.domains/api/v1/check';

export async function getQueryDomainsBulkCheck(
  domains: string[]
): Promise<QueryDomainsCheckResult[]> {
  const apiKey = getApiKey();
  const targets = domains
    .map((domain) =>
      String(domain || '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);

  if (targets.length === 0) return [];

  const url = new URL(getCheckUrl());
  url.searchParams.set('domain', targets.join(','));
  url.searchParams.set('format', 'json');

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
      throw new TrafficProviderError(
        'Bulk domain data is temporarily unavailable.',
        'provider_error',
        response.status
      );
    }

    const raw = parseCheckJson(text);
    if (raw.error && raw.error !== 0) {
      throw new TrafficProviderError(
        'Bulk domain data is temporarily unavailable.',
        'provider_error',
        502
      );
    }

    return (raw.data?.domains || []).map((item) => ({
      domain: String(item.domain || '')
        .trim()
        .toLowerCase(),
      registeredAt: parseDate(item.registered),
      expiresAt: parseDate(item.expires),
      status: emptyToNull(item.status),
      raw: item as Record<string, unknown>,
    }));
  } catch (error) {
    if (error instanceof TrafficProviderError) {
      throw error;
    }

    throw new TrafficProviderError(
      'Bulk domain data is temporarily unavailable.',
      'network_error',
      502
    );
  }
}

export async function getQueryDomainsWhois(
  domain: string
): Promise<QueryDomainsWhoisResult> {
  const apiKey = getApiKey();

  const url = new URL(getWhoisUrl());
  url.searchParams.set('domain', domain);

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
      throw new TrafficProviderError(
        'WHOIS data is temporarily unavailable.',
        'provider_error',
        response.status
      );
    }

    const raw = parseJson(text);
    const parsed = raw.parsed || {};
    const registeredAt = parseDate(parsed.registered);

    if (!registeredAt) {
      throw new TrafficProviderError(
        'No registration date is available for this domain.',
        'no_registration_date',
        404
      );
    }

    return {
      domain: parsed.id || parsed.name || domain,
      registeredAt,
      registrar: emptyToNull(parsed.registrar),
      expiresAt: parseDate(parsed.expires),
      updatedAt: parseDate(parsed.d_updated),
      status: emptyToNull(parsed.status),
      nameservers: emptyToNull(parsed.nameservers),
      raw,
    };
  } catch (error) {
    if (error instanceof TrafficProviderError) {
      throw error;
    }

    throw new TrafficProviderError(
      'WHOIS data is temporarily unavailable.',
      'network_error',
      502
    );
  }
}

function getWhoisUrl() {
  return (process.env.QUERY_DOMAINS_WHOIS_URL || DEFAULT_WHOIS_URL).replace(
    /\/$/,
    ''
  );
}

function getCheckUrl() {
  return (process.env.QUERY_DOMAINS_CHECK_URL || DEFAULT_CHECK_URL).replace(
    /\/$/,
    ''
  );
}

function getApiKey() {
  const apiKey = process.env.QUERY_DOMAINS_API_KEY;
  if (!apiKey) {
    throw new TrafficProviderError(
      'Domain data is temporarily unavailable.',
      'provider_not_configured',
      503
    );
  }

  return apiKey;
}

function parseJson(text: string): QueryDomainsWhoisResponse {
  try {
    return JSON.parse(text) as QueryDomainsWhoisResponse;
  } catch {
    throw new TrafficProviderError(
      'WHOIS data response is not valid JSON.',
      'invalid_response',
      502
    );
  }
}

function parseCheckJson(text: string): QueryDomainsCheckResponse {
  try {
    return JSON.parse(text) as QueryDomainsCheckResponse;
  } catch {
    throw new TrafficProviderError(
      'Bulk domain data response is not valid JSON.',
      'invalid_response',
      502
    );
  }
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const normalized = normalizeDateString(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateString(value: string) {
  const trimmed = value.trim();
  const dayFirst = trimmed.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/
  );

  if (dayFirst) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] =
      dayFirst;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  return trimmed;
}

function emptyToNull(value?: string | null) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}
