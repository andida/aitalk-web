import { normalizeDomain } from '@/features/traffic/domain';
import { TrafficProviderError } from '@/features/traffic/types';
import {
  lookupDomainWhois,
  type WhoisLookupResult,
} from '@/features/traffic/whois';

import {
  findCachedDomainWhois,
  saveDomainWhoisCache,
  type DomainWhoisCacheView,
} from '@/shared/models/siterise';

type WhoisLookupRequest = {
  domain?: string;
  refresh?: boolean;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleWhoisLookup({
    domain: url.searchParams.get('domain') || '',
    refresh: url.searchParams.get('refresh') === 'true',
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as WhoisLookupRequest;
  return handleWhoisLookup({
    domain: body.domain || '',
    refresh: body.refresh === true,
  });
}

async function handleWhoisLookup({
  domain,
  refresh,
}: {
  domain: string;
  refresh: boolean;
}) {
  try {
    const normalized = normalizeDomain(domain);
    const cached = refresh
      ? null
      : await findCachedDomainWhois({ rootDomain: normalized.rootDomain });

    if (cached) {
      return json({
        code: 0,
        message: 'ok',
        data: formatWhoisResponse({
          normalized,
          result: cached,
        }),
      });
    }

    const result = await lookupDomainWhois(normalized.rootDomain);
    const saved = await saveDomainWhoisCache({
      rootDomain: normalized.rootDomain,
      hostname: normalized.hostname,
      result,
    });

    return json({
      code: 0,
      message: 'ok',
      data: formatWhoisResponse({
        normalized,
        result: saved,
      }),
    });
  } catch (error) {
    if (error instanceof TrafficProviderError) {
      return json(
        {
          code: -1,
          message: sanitizeWhoisErrorMessage(error.message),
          error: error.code,
        },
        error.status
      );
    }

    return json(
      {
        code: -1,
        message:
          error instanceof Error
            ? sanitizeWhoisErrorMessage(error.message)
            : 'Domain registration lookup failed.',
        error: 'invalid_request',
      },
      400
    );
  }
}

function formatWhoisResponse({
  normalized,
  result,
}: {
  normalized: ReturnType<typeof normalizeDomain>;
  result: WhoisLookupResult | DomainWhoisCacheView;
}) {
  return {
    input: normalized.input,
    hostname: normalized.hostname,
    rootDomain: normalized.rootDomain,
    domain: result.domain || normalized.rootDomain,
    registeredAt: result.registeredAt?.toISOString() || null,
    expiresAt: result.expiresAt?.toISOString() || null,
    updatedAt: result.updatedAt?.toISOString() || null,
    status: result.status,
    registrar: result.registrar,
    nameservers: result.nameservers,
    source: result.source,
    sourceLabel: result.source === 'rdap' ? 'RDAP' : 'Query.Domains',
    rdapServer: result.rdapServer || null,
    cached: 'cached' in result ? result.cached : false,
    fetchedAt: 'fetchedAt' in result ? result.fetchedAt.toISOString() : null,
    cachedUntil:
      'cachedUntil' in result ? result.cachedUntil.toISOString() : null,
  };
}

function sanitizeWhoisErrorMessage(message: string) {
  return message
    .replace(/Query\.Domains/gi, 'fallback provider')
    .replace(/Cloudflare Worker/gi, 'deployment environment')
    .replace(/Cloudflare/gi, 'deployment provider')
    .replace(/Supabase/gi, 'database');
}
