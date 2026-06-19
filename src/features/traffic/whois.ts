import {
  getQueryDomainsWhois,
  type QueryDomainsWhoisResult,
} from './query-domains-whois';
import { TrafficProviderError } from './types';

type WhoisLookupSource = 'rdap' | 'query_domains';

type RdapBootstrap = {
  version?: string;
  publication?: string;
  services?: Array<[string[], string[]]>;
};

type RdapEvent = {
  eventAction?: string;
  eventDate?: string;
};

type RdapEntity = {
  roles?: string[];
  vcardArray?: unknown[];
  entities?: RdapEntity[];
};

type RdapNameserver = {
  ldhName?: string;
  unicodeName?: string;
};

type RdapDomainResponse = {
  objectClassName?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: RdapNameserver[];
};

export type WhoisLookupResult = {
  domain: string;
  registeredAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date | null;
  status: string | null;
  registrar: string | null;
  nameservers: string[];
  source: WhoisLookupSource;
  rdapServer?: string | null;
  raw: Record<string, unknown>;
};

const DEFAULT_RDAP_DNS_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';
const DEFAULT_RDAP_TIMEOUT_MS = 8000;
const RDAP_BOOTSTRAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedBootstrap:
  | {
      expiresAt: number;
      data: RdapBootstrap;
    }
  | undefined;

export async function lookupDomainWhois(
  domain: string,
  {
    allowFallback = true,
    timeoutMs = getRdapTimeoutMs(),
  }: {
    allowFallback?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<WhoisLookupResult> {
  let rdapResult: WhoisLookupResult | null = null;
  let rdapError: unknown = null;

  try {
    rdapResult = await lookupDomainWhoisViaRdap(domain, timeoutMs);
    if (rdapResult.registeredAt || !allowFallback) {
      return rdapResult;
    }
  } catch (error) {
    rdapError = error;
    if (!allowFallback) {
      throw error;
    }
  }

  try {
    return mapQueryDomainsWhoisResult(await getQueryDomainsWhois(domain));
  } catch (fallbackError) {
    if (rdapResult) {
      return rdapResult;
    }
    if (rdapError instanceof Error) {
      throw rdapError;
    }
    throw fallbackError;
  }
}

export async function lookupDomainWhoisViaRdap(
  domain: string,
  timeoutMs = getRdapTimeoutMs()
): Promise<WhoisLookupResult> {
  const rootDomain = String(domain || '')
    .trim()
    .toLowerCase();
  const tld = getTld(rootDomain);
  const rdapServer = await findRdapServerForTld(tld, timeoutMs);
  const url = joinRdapDomainUrl(rdapServer, rootDomain);
  const raw = await fetchRdapJson<RdapDomainResponse>(url, timeoutMs);

  if (raw.objectClassName && raw.objectClassName !== 'domain') {
    throw new TrafficProviderError(
      'Domain registration data is not available.',
      'invalid_response',
      502
    );
  }

  return {
    domain: normalizeRdapDomain(raw.ldhName || raw.unicodeName || rootDomain),
    registeredAt: findRdapEventDate(raw.events, ['registration', 'registered']),
    expiresAt: findRdapEventDate(raw.events, ['expiration', 'expiry']),
    updatedAt: findRdapEventDate(raw.events, [
      'last changed',
      'last update',
      'last update of rdap database',
    ]),
    status: Array.isArray(raw.status) ? raw.status.join(', ') || null : null,
    registrar: findRegistrar(raw.entities),
    nameservers: (raw.nameservers || [])
      .map((nameserver) =>
        normalizeRdapDomain(nameserver.ldhName || nameserver.unicodeName || '')
      )
      .filter(Boolean),
    source: 'rdap',
    rdapServer,
    raw: raw as Record<string, unknown>,
  };
}

async function findRdapServerForTld(tld: string, timeoutMs: number) {
  const bootstrap = await getRdapBootstrap(timeoutMs);
  for (const service of bootstrap.services || []) {
    const [tlds, urls] = service;
    if (!Array.isArray(tlds) || !Array.isArray(urls)) continue;
    if (tlds.some((entry) => entry.toLowerCase() === tld)) {
      const url = urls.find(Boolean);
      if (url) return url;
    }
  }

  throw new TrafficProviderError(
    'Domain registration data is not available for this TLD.',
    'rdap_server_not_found',
    404
  );
}

async function getRdapBootstrap(timeoutMs: number) {
  if (cachedBootstrap && cachedBootstrap.expiresAt > Date.now()) {
    return cachedBootstrap.data;
  }

  const data = await fetchRdapJson<RdapBootstrap>(
    process.env.RDAP_DNS_BOOTSTRAP_URL || DEFAULT_RDAP_DNS_BOOTSTRAP_URL,
    timeoutMs
  );
  cachedBootstrap = {
    data,
    expiresAt: Date.now() + RDAP_BOOTSTRAP_CACHE_TTL_MS,
  };

  return data;
}

async function fetchRdapJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/rdap+json,application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await response.text();

    if (!response.ok) {
      throw new TrafficProviderError(
        response.status === 404
          ? 'Domain registration data was not found.'
          : 'Domain registration data is temporarily unavailable.',
        response.status === 404 ? 'not_found' : 'provider_error',
        response.status
      );
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new TrafficProviderError(
        'Domain registration data response is not valid JSON.',
        'invalid_response',
        502
      );
    }
  } catch (error) {
    if (error instanceof TrafficProviderError) {
      throw error;
    }

    throw new TrafficProviderError(
      error instanceof Error && error.name === 'AbortError'
        ? 'Domain registration lookup timed out.'
        : 'Domain registration data is temporarily unavailable.',
      error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : 'network_error',
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}

function mapQueryDomainsWhoisResult(
  result: QueryDomainsWhoisResult
): WhoisLookupResult {
  return {
    domain: normalizeRdapDomain(result.domain),
    registeredAt: result.registeredAt,
    expiresAt: result.expiresAt,
    updatedAt: result.updatedAt,
    status: result.status,
    registrar: result.registrar,
    nameservers: result.nameservers
      ? result.nameservers
          .split(',')
          .map((item) => normalizeRdapDomain(item))
          .filter(Boolean)
      : [],
    source: 'query_domains',
    rdapServer: null,
    raw: result.raw as Record<string, unknown>,
  };
}

function getTld(domain: string) {
  const parts = domain.split('.').filter(Boolean);
  const tld = parts.at(-1);
  if (!tld || parts.length < 2) {
    throw new TrafficProviderError(
      'Domain must include a valid TLD.',
      'invalid_domain',
      400
    );
  }
  return tld.toLowerCase();
}

function joinRdapDomainUrl(baseUrl: string, domain: string) {
  return `${baseUrl.replace(/\/+$/, '')}/domain/${encodeURIComponent(domain)}`;
}

function findRdapEventDate(events: RdapEvent[] | undefined, actions: string[]) {
  for (const action of actions) {
    const event = (events || []).find(
      (item) =>
        String(item.eventAction || '').toLowerCase() === action.toLowerCase()
    );
    const date = parseDate(event?.eventDate);
    if (date) return date;
  }

  return null;
}

function findRegistrar(entities: RdapEntity[] | undefined): string | null {
  for (const entity of entities || []) {
    const roles = (entity.roles || []).map((role) => role.toLowerCase());
    if (roles.includes('registrar')) {
      return getVcardText(entity, 'fn') || getVcardText(entity, 'org');
    }
  }

  for (const entity of entities || []) {
    const nested = findRegistrar(entity.entities);
    if (nested) return nested;
  }

  return null;
}

function getVcardText(entity: RdapEntity, key: string) {
  const cards = entity.vcardArray?.[1];
  if (!Array.isArray(cards)) return null;

  for (const card of cards) {
    if (!Array.isArray(card)) continue;
    if (String(card[0] || '').toLowerCase() === key) {
      const value = card[3];
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    }
  }

  return null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRdapDomain(value: string) {
  return String(value || '')
    .trim()
    .replace(/\.$/, '')
    .toLowerCase();
}

function getRdapTimeoutMs() {
  const configured = Number(process.env.RDAP_LOOKUP_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_RDAP_TIMEOUT_MS;
}
