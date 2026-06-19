import { normalizeDomain } from '@/features/traffic/domain';
import { getQueryDomainsTrafficDataset } from '@/features/traffic/query-domains';
import {
  TrafficProviderError,
  type TrafficSummaryResult,
} from '@/features/traffic/types';

import { getClientIp } from '@/shared/lib/ip';
import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';
import {
  findCachedTrafficSummary,
  logTrafficQuery,
  saveTrafficSummaries,
  saveTrafficSummary,
} from '@/shared/models/siterise';
import { getUserInfo } from '@/shared/models/user';

type LookupRequest = {
  target?: string;
  country?: string;
  month?: string;
};

function json(data: any, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}

function normalizeCountry(country?: string) {
  const value = String(country || '').trim();
  if (!value || value.toLowerCase() === 'global') return 'global';

  if (!/^[a-z]{2}$/i.test(value)) {
    throw new Error('Country must be a two-letter ISO code or global.');
  }

  return value.toUpperCase();
}

function normalizeMonth(month?: string) {
  const value = String(month || '').trim();
  if (!value) return undefined;

  if (!/^\d{4}-\d{2}-01$/.test(value)) {
    throw new Error('Month must use YYYY-MM-01 format.');
  }

  return value;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const rateLimit = enforceMinIntervalRateLimit(request, {
    intervalMs: 1200,
    keyPrefix: 'traffic-lookup',
  });

  if (rateLimit) return rateLimit;

  let normalized: ReturnType<typeof normalizeDomain> | null = null;
  let country = 'global';
  let displayDate: string | undefined;
  let userId: string | null = null;
  let ip: string | null = null;

  try {
    const [body, user, clientIp] = await Promise.all([
      request.json() as Promise<LookupRequest>,
      getOptionalUser(),
      getClientIp().catch(() => null),
    ]);
    userId = user?.id || null;
    ip = clientIp;
    normalized = normalizeDomain(body.target || '');
    country = normalizeCountry(body.country);
    displayDate = normalizeMonth(body.month);

    const cached = await findCachedTrafficSummary({
      rootDomain: normalized.rootDomain,
      country,
      displayDate,
    });

    if (cached) {
      await logTrafficQuery({
        userId,
        ip,
        endpoint: 'lookup',
        targets: [normalized.rootDomain],
        country,
        displayDate,
        status: 'ok',
        provider: cached.source,
        latencyMs: Date.now() - startedAt,
        cached: true,
      });

      return json({
        code: 0,
        message: 'ok',
        data: {
          input: normalized.input,
          hostname: normalized.hostname,
          rootDomain: normalized.rootDomain,
          ...cached,
        },
      });
    }

    const providerResult = await getTrafficSummaryFromProviders({
      target: normalized.rootDomain,
      country,
      displayDate,
    });

    const saved = await saveLookupProviderResult({
      rootDomain: normalized.rootDomain,
      hostname: normalized.hostname,
      country,
      displayDate,
      providerResult,
    });

    await logTrafficQuery({
      userId,
      ip,
      endpoint: 'lookup',
      targets: [normalized.rootDomain],
      country,
      displayDate,
      status: 'ok',
      provider: saved.source,
      latencyMs: Date.now() - startedAt,
      cached: false,
    });

    return json({
      code: 0,
      message: 'ok',
      data: {
        input: normalized.input,
        hostname: normalized.hostname,
        rootDomain: normalized.rootDomain,
        ...saved,
      },
    });
  } catch (error) {
    await maybeLogFailedTrafficQuery({
      userId,
      ip,
      rootDomain: normalized?.rootDomain,
      country,
      displayDate,
      startedAt,
      error,
    });

    if (error instanceof TrafficProviderError) {
      return json(
        {
          code: -1,
          message: sanitizeLookupErrorMessage(error.message),
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
            ? sanitizeLookupErrorMessage(error.message)
            : 'Traffic lookup failed.',
        error: 'invalid_request',
      },
      400
    );
  }
}

async function getTrafficSummaryFromProviders({
  target,
  country,
  displayDate,
}: {
  target: string;
  country: string;
  displayDate?: string;
}): Promise<LookupProviderResult> {
  if (country !== 'global') {
    throw new TrafficProviderError(
      'Only global traffic lookup is available right now.',
      'unsupported_country',
      400
    );
  }

  return getQueryDomainsTrafficDataset({
    target,
    country,
    displayDate,
  });
}

function sanitizeLookupErrorMessage(message: string) {
  return message
    .replace(/Cloudflare Worker/gi, 'deployment environment')
    .replace(/Cloudflare/gi, 'deployment provider')
    .replace(/Supabase/gi, 'database')
    .replace(/runtime/gi, 'environment');
}

type LookupProviderResult = {
  selected: TrafficSummaryResult;
  snapshots: TrafficSummaryResult[];
};

async function saveLookupProviderResult({
  rootDomain,
  hostname,
  country,
  displayDate,
  providerResult,
}: {
  rootDomain: string;
  hostname?: string;
  country: string;
  displayDate?: string;
  providerResult: LookupProviderResult;
}) {
  const results = providerResult.snapshots.map((snapshot) => ({
    ...snapshot,
    cached: false,
  }));

  if (results.length > 1) {
    const savedSnapshots = await saveTrafficSummaries({
      rootDomain,
      hostname,
      country,
      displayDate,
      results,
    });
    return (
      savedSnapshots.find(
        (snapshot) =>
          snapshot.source === providerResult.selected.source &&
          snapshot.month === providerResult.selected.month
      ) ||
      savedSnapshots[0] ||
      providerResult.selected
    );
  }

  return saveTrafficSummary({
    rootDomain,
    hostname,
    country,
    displayDate,
    result: results[0] || providerResult.selected,
  });
}

async function getOptionalUser() {
  try {
    return await getUserInfo();
  } catch {
    return null;
  }
}

async function maybeLogFailedTrafficQuery({
  userId,
  ip,
  rootDomain,
  country,
  displayDate,
  startedAt,
  error,
}: {
  userId: string | null;
  ip: string | null;
  rootDomain?: string;
  country: string;
  displayDate?: string;
  startedAt: number;
  error: unknown;
}) {
  if (!rootDomain) return;

  try {
    await logTrafficQuery({
      userId,
      ip,
      endpoint: 'lookup',
      targets: [rootDomain],
      country,
      displayDate,
      status: 'error',
      errorCode:
        error instanceof TrafficProviderError ? error.code : 'invalid_request',
      latencyMs: Date.now() - startedAt,
      cached: false,
    });
  } catch (logError) {
    console.error('write traffic query log failed:', logError);
  }
}
