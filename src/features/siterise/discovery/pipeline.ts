import { normalizeDomain } from '@/features/traffic/domain';
import { getQueryDomainsTrafficDataset } from '@/features/traffic/query-domains';
import { lookupDomainWhois } from '@/features/traffic/whois';

import {
  buildNewWebsiteLeaderboard,
  findCachedDomainWhois,
  getSiteRiseDomainsByRootDomains,
  saveDomainWhoisCache,
  saveTrafficSummariesForDomain,
  upsertDiscoveredDomain,
  type DomainWhoisCacheView,
} from '@/shared/models/siterise';

import {
  checkDns,
  checkHomepage,
  checkTls,
  getAhrefsDomainRating,
  type AuthorityCheckResult,
  type DnsCheckResult,
  type HomepageCheckResult,
  type TlsCheckResult,
} from './checks';
import type {
  DiscoveryCandidate,
  DiscoveryDecision,
  DiscoveryRuntimeOptions,
  NormalizedDiscoveryCandidate,
} from './types';

type RegistrationResult = {
  registeredAt: Date | null;
  expiresAt?: Date | null;
  updatedAt?: Date | null;
  status?: string | null;
  registrar?: string | null;
  nameservers?: string[];
  source?: string;
  raw?: Record<string, unknown> | null;
};

type PipelineStats = {
  candidates: number;
  uniqueCandidates: number;
  accepted: number;
  rejected: number;
  trafficLookups: number;
  saved: number;
};

export type DiscoveryPipelineResult = {
  stats: PipelineStats;
  decisions: DiscoveryDecision[];
};

export async function runDiscoveryPipeline({
  candidates,
  options,
}: {
  candidates: DiscoveryCandidate[];
  options: DiscoveryRuntimeOptions;
}): Promise<DiscoveryPipelineResult> {
  const normalized = normalizeCandidates(candidates).slice(
    0,
    options.candidateLimit
  );
  const existing = await getSiteRiseDomainsByRootDomains(
    normalized.map((candidate) => candidate.rootDomain)
  );
  const decisions: DiscoveryDecision[] = [];
  const stats: PipelineStats = {
    candidates: candidates.length,
    uniqueCandidates: normalized.length,
    accepted: 0,
    rejected: 0,
    trafficLookups: 0,
    saved: 0,
  };

  const prescreened: Array<{
    candidate: NormalizedDiscoveryCandidate;
    dns: DnsCheckResult;
    tls: TlsCheckResult;
    homepage: HomepageCheckResult;
  }> = [];

  for (const candidate of normalized) {
    const current = existing.get(candidate.rootDomain);
    if ((current?.status as string | undefined) === 'blocked') {
      decisions.push(reject(candidate, 'blocked'));
      continue;
    }

    const dns = await checkDns(candidate.rootDomain, options.dnsTimeoutMs);
    if (!dns.ok) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'dns_failed',
        metadata: { dns },
      });
      decisions.push(reject(candidate, 'dns_failed', { dns }));
      continue;
    }

    const tls = await checkTls(candidate.rootDomain, options.httpTimeoutMs);
    if (!tls.ok) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'https_failed',
        metadata: { dns, tls },
      });
      decisions.push(reject(candidate, 'https_failed', { dns, tls }));
      continue;
    }

    const homepage = await checkHomepage(
      candidate.rootDomain,
      options.httpTimeoutMs
    );
    if (!homepage.ok) {
      const reason = homepage.isLowQuality
        ? 'parked_or_low_quality'
        : 'homepage_failed';
      await maybeSaveRejected({
        candidate,
        options,
        reason,
        metadata: { dns, tls, homepage },
      });
      decisions.push(
        reject(candidate, reason, {
          dns,
          tls,
          homepage,
        })
      );
      continue;
    }

    prescreened.push({ candidate, dns, tls, homepage });
  }

  for (const item of prescreened) {
    const { candidate, dns, tls, homepage } = item;
    const registration = await getWhoisRegistration(candidate.rootDomain, {
      writeCache: !options.dryRun,
    });
    const registeredAt = registration.registeredAt;

    if (!registeredAt) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'registration_missing',
        metadata: { dns, tls, homepage, registration },
      });
      decisions.push(
        reject(candidate, 'registration_missing', {
          dns,
          tls,
          homepage,
          registration,
        })
      );
      continue;
    }

    if (!isWithinDays(registeredAt, options.days)) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'registration_too_old',
        registeredAt,
        metadata: { dns, tls, homepage, registration },
      });
      decisions.push(
        reject(candidate, 'registration_too_old', {
          registeredAt: registeredAt.toISOString(),
          dns,
          tls,
          homepage,
        })
      );
      continue;
    }

    const authority = await getAhrefsDomainRating(candidate.rootDomain);
    const domainRating = authority.domainRating;
    if (domainRating === null && options.minDomainRating > 0) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'domain_rating_unavailable',
        registeredAt,
        authority,
        metadata: { dns, tls, homepage, registration },
      });
      decisions.push(
        reject(candidate, 'domain_rating_unavailable', {
          minDomainRating: options.minDomainRating,
          error: authority.error || 'domain_rating_unavailable',
        })
      );
      continue;
    }

    if (
      typeof domainRating === 'number' &&
      domainRating < options.minDomainRating
    ) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'domain_rating_too_low',
        registeredAt,
        authority,
        metadata: { dns, tls, homepage, registration },
      });
      decisions.push(
        reject(candidate, 'domain_rating_too_low', {
          domainRating,
          minDomainRating: options.minDomainRating,
        })
      );
      continue;
    }

    if (stats.trafficLookups >= options.trafficLimit) {
      decisions.push(
        reject(candidate, 'traffic_failed', { error: 'traffic_limit_reached' })
      );
      continue;
    }

    let traffic;
    try {
      stats.trafficLookups += 1;
      traffic = await getQueryDomainsTrafficDataset({
        target: candidate.rootDomain,
        country: options.country,
      });
    } catch (error) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'traffic_failed',
        registeredAt,
        authority,
        metadata: {
          dns,
          tls,
          homepage,
          registration,
          trafficError:
            error instanceof Error ? error.message : 'traffic_failed',
        },
      });
      decisions.push(
        reject(candidate, 'traffic_failed', {
          error: error instanceof Error ? error.message : 'traffic_failed',
        })
      );
      continue;
    }

    const visits = traffic.selected.metrics.visits || 0;
    if (visits < options.minVisits) {
      await maybeSaveRejected({
        candidate,
        options,
        reason: 'traffic_too_low',
        registeredAt,
        authority,
        metadata: { dns, tls, homepage, registration, visits },
      });
      decisions.push(
        reject(candidate, 'traffic_too_low', {
          visits,
          minVisits: options.minVisits,
        })
      );
      continue;
    }

    if (!options.dryRun) {
      const domain = await upsertDiscoveredDomain({
        rootDomain: candidate.rootDomain,
        hostname: candidate.hostname,
        category: candidate.category || homepage.title || undefined,
        country: candidate.country || options.country,
        registeredAt,
        title: candidate.title || homepage.title || undefined,
        description: candidate.description || homepage.description || undefined,
        sourceUrl: candidate.sourceUrl || candidate.url,
        source: 'query_domains',
        status: 'active',
        metadata: getDiscoveryMetadata({
          candidate,
          reason: 'saved',
          dns,
          tls,
          homepage,
          registration,
          authority,
          visits,
        }),
      });
      await saveTrafficSummariesForDomain({
        domainId: domain.id,
        rootDomain: candidate.rootDomain,
        country: options.country,
        results: traffic.snapshots,
      });
      stats.saved += 1;
    }

    stats.accepted += 1;
    decisions.push({
      candidate,
      accepted: true,
      reason: options.dryRun ? 'dry_run' : 'saved',
      rootDomain: candidate.rootDomain,
      visits,
      registeredAt: registeredAt.toISOString(),
      domainRating,
      details: {
        source: candidate.source,
        title: candidate.title || homepage.title || null,
      },
    });
  }

  stats.rejected = decisions.filter((decision) => !decision.accepted).length;

  if (!options.dryRun && options.buildLeaderboard) {
    await buildNewWebsiteLeaderboard({
      country: options.country,
      rangeDays: options.days,
      minVisits: options.minVisits,
      source: 'query_domains',
      limit: 100,
    });
  }

  return {
    stats,
    decisions,
  };
}

function normalizeCandidates(candidates: DiscoveryCandidate[]) {
  const byDomain = new Map<string, NormalizedDiscoveryCandidate>();

  for (const candidate of candidates) {
    try {
      const normalized = normalizeDomain(candidate.url || candidate.rootDomain);
      if (!byDomain.has(normalized.rootDomain)) {
        byDomain.set(normalized.rootDomain, {
          ...candidate,
          rootDomain: normalized.rootDomain,
          hostname: normalized.hostname,
          normalized,
        });
      }
    } catch {
      continue;
    }
  }

  return [...byDomain.values()];
}

async function getWhoisRegistration(
  rootDomain: string,
  { writeCache = true }: { writeCache?: boolean } = {}
): Promise<RegistrationResult> {
  const cached = await findCachedDomainWhois({ rootDomain });
  if (cached) {
    return mapCachedWhoisRegistration(cached);
  }

  try {
    const whois = await lookupDomainWhois(rootDomain);
    if (writeCache) {
      await saveDomainWhoisCache({
        rootDomain,
        result: whois,
      });
    }
    return {
      registeredAt: whois.registeredAt,
      expiresAt: whois.expiresAt,
      updatedAt: whois.updatedAt,
      status: whois.status,
      registrar: whois.registrar,
      nameservers: whois.nameservers,
      source: whois.source,
      raw: whois.raw as Record<string, unknown>,
    };
  } catch {
    const stale = await findCachedDomainWhois({
      rootDomain,
      allowStale: true,
    });
    if (stale?.registeredAt) {
      return mapCachedWhoisRegistration(stale);
    }

    return { registeredAt: null };
  }
}

function mapCachedWhoisRegistration(
  cached: DomainWhoisCacheView
): RegistrationResult {
  return {
    registeredAt: cached.registeredAt,
    expiresAt: cached.expiresAt,
    updatedAt: cached.updatedAt,
    status: cached.status,
    registrar: cached.registrar,
    nameservers: cached.nameservers,
    source: cached.source,
    raw: null,
  };
}

async function maybeSaveRejected({
  candidate,
  options,
  reason,
  registeredAt,
  authority,
  metadata,
}: {
  candidate: NormalizedDiscoveryCandidate;
  options: DiscoveryRuntimeOptions;
  reason:
    | 'dns_failed'
    | 'https_failed'
    | 'homepage_failed'
    | 'parked_or_low_quality'
    | 'registration_missing'
    | 'registration_too_old'
    | 'domain_rating_unavailable'
    | 'domain_rating_too_low'
    | 'traffic_failed'
    | 'traffic_too_low';
  registeredAt?: Date | null;
  authority?: AuthorityCheckResult;
  metadata: Record<string, unknown>;
}) {
  if (options.dryRun) return;

  await upsertDiscoveredDomain({
    rootDomain: candidate.rootDomain,
    hostname: candidate.hostname,
    category: candidate.category,
    country: candidate.country || options.country,
    registeredAt: registeredAt || null,
    title: candidate.title,
    description: candidate.description,
    sourceUrl: candidate.sourceUrl || candidate.url,
    source: 'query_domains',
    status: 'rejected',
    metadata: getDiscoveryMetadata({
      candidate,
      reason,
      authority,
      ...metadata,
    }),
  });
}

function getDiscoveryMetadata({
  candidate,
  reason,
  dns,
  tls,
  homepage,
  registration,
  authority,
  visits,
}: {
  candidate: DiscoveryCandidate;
  reason: string;
  dns?: DnsCheckResult;
  tls?: TlsCheckResult;
  homepage?: HomepageCheckResult;
  registration?: RegistrationResult;
  authority?: AuthorityCheckResult;
  visits?: number | null;
}) {
  return {
    discovery: {
      source: candidate.source,
      sourceUrl: candidate.sourceUrl || candidate.url,
      productName: candidate.title || null,
      filterReason: reason,
      dns,
      tls,
      homepage,
      registration: {
        registeredAt: registration?.registeredAt?.toISOString() || null,
        expiresAt: registration?.expiresAt?.toISOString() || null,
        updatedAt: registration?.updatedAt?.toISOString() || null,
        status: registration?.status || null,
        registrar: registration?.registrar || null,
        nameservers: registration?.nameservers || [],
        source: registration?.source || null,
      },
      visits: visits ?? null,
      checkedAt: new Date().toISOString(),
      metadata: candidate.metadata || null,
    },
    authority: {
      provider: 'ahrefs',
      domainRating: authority?.domainRating ?? null,
      error: authority?.error || null,
      checkedAt: authority ? new Date().toISOString() : null,
    },
  };
}

function reject(
  candidate: NormalizedDiscoveryCandidate,
  reason: DiscoveryDecision['reason'],
  details?: Record<string, unknown>
): DiscoveryDecision {
  return {
    candidate,
    accepted: false,
    reason,
    rootDomain: candidate.rootDomain,
    details,
  };
}

function isWithinDays(value: Date, days: number) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  return value.getTime() >= since.getTime();
}
