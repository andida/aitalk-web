import type {
  TrafficDataSource,
  TrafficSummaryMetrics,
  TrafficSummaryResult,
} from '@/features/traffic/types';
import type { WhoisLookupResult } from '@/features/traffic/whois';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  notInArray,
} from 'drizzle-orm';

import { db } from '@/core/db';
import {
  siteriseDomain,
  siteriseDomainWhoisCache,
  siteriseLeaderboardEntry,
  siteriseLeaderboardRun,
  siteriseTrafficQueryLog,
  siteriseTrafficSnapshot,
} from '@/config/db/schema';
import { getUuid, md5 } from '@/shared/lib/hash';

const DEFAULT_COUNTRY = 'global';
const DEFAULT_DEVICE_TYPE = 'all';
const DEFAULT_SOURCE: TrafficDataSource = 'query_domains';
const DEFAULT_WHOIS_CACHE_TTL_DAYS = 7;
const SOURCE_PRIORITY: TrafficDataSource[] = [
  'similarweb_manual',
  'query_domains',
  'similarweb_public',
];

type TrafficSnapshotRow = typeof siteriseTrafficSnapshot.$inferSelect;
type SiteRiseDomainRow = typeof siteriseDomain.$inferSelect;
type SiteRiseLeaderboardRunRow = typeof siteriseLeaderboardRun.$inferSelect;
type SiteRiseLeaderboardEntryRow = typeof siteriseLeaderboardEntry.$inferSelect;

export type SiteRiseLeaderboardKind = 'growth' | 'new';

export type UpsertSeedDomainInput = {
  rootDomain: string;
  hostname?: string;
  category?: string | null;
  country?: string | null;
  registeredAt?: Date | null;
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
};

export type UpsertTrafficImportDomainInput = UpsertSeedDomainInput & {
  source?: TrafficDataSource;
  metadata?: Record<string, unknown> | null;
};

export type UpsertDiscoveredDomainInput = UpsertSeedDomainInput & {
  status: 'active' | 'candidate' | 'rejected';
  source?: TrafficDataSource;
  metadata?: Record<string, unknown> | null;
};

export type TrafficRefreshCandidate = {
  id: string;
  rootDomain: string;
  hostname: string | null;
};

export type WhoisRefreshCandidate = TrafficRefreshCandidate;

export type DomainWhoisCacheView = {
  domain: string;
  registeredAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date | null;
  status: string | null;
  registrar: string | null;
  nameservers: string[];
  source: 'rdap' | 'query_domains';
  rdapServer: string | null;
  fetchedAt: Date;
  cachedUntil: Date;
  cached: boolean;
};

export type SiteRiseDomainStatusView = {
  id: string;
  rootDomain: string;
  status: string;
  registeredAt: Date | null;
  metadata: Record<string, unknown> | null;
};

export type LeaderboardEntryView = {
  rank: number;
  rootDomain: string;
  visits: number | null;
  previousVisits: number | null;
  visitsDelta: number | null;
  growthRate: number | null;
  score: number | null;
  signal: string | null;
  category: string | null;
  registeredAt: string | null;
  monthlyTrend: Array<{
    month: string;
    visits: number | null;
  }>;
};

export type LeaderboardView = {
  kind: SiteRiseLeaderboardKind;
  month: string;
  country: string;
  category: string | null;
  range: number | null;
  limit: number;
  isPreview: boolean;
  generatedAt: string | null;
  entries: LeaderboardEntryView[];
};

export type DomainDetailView = {
  rootDomain: string;
  hostname: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  country: string | null;
  registeredAt: string | null;
  firstSeenAt: string | null;
  source: string;
  status: string;
  monthlyTrend: Array<{
    month: string;
    visits: number | null;
  }>;
  growthRate: number | null;
  visitsDelta: number | null;
  leaderboardEntries: Array<{
    kind: string;
    month: string;
    rank: number;
    growthRate: number | null;
    visits: number | null;
  }>;
  isPreview: boolean;
};

export type FindCachedTrafficSummaryInput = {
  rootDomain: string;
  country: string;
  displayDate?: string;
  source?: TrafficDataSource;
};

export type SaveTrafficSummaryInput = FindCachedTrafficSummaryInput & {
  hostname?: string;
  result: TrafficSummaryResult;
};

export type SaveTrafficSummariesInput = Omit<
  SaveTrafficSummaryInput,
  'result'
> & {
  results: TrafficSummaryResult[];
};

export type SaveTrafficSummariesForDomainInput = SaveTrafficSummariesInput & {
  domainId: string;
};

export type LogTrafficQueryInput = {
  userId?: string | null;
  ip?: string | null;
  endpoint: string;
  targets: string[];
  country: string;
  displayDate?: string;
  status: 'ok' | 'error';
  provider?: TrafficDataSource;
  errorCode?: string;
  latencyMs?: number;
  cached?: boolean;
};

export async function findCachedTrafficSummary({
  rootDomain,
  country,
  displayDate,
  source,
}: FindCachedTrafficSummaryInput): Promise<TrafficSummaryResult | null> {
  const normalizedCountry = normalizeCountry(country);
  const conditions = [
    eq(siteriseTrafficSnapshot.rootDomain, rootDomain),
    eq(siteriseTrafficSnapshot.country, normalizedCountry),
    eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE),
    gt(siteriseTrafficSnapshot.cacheUntil, new Date()),
  ];

  if (source) {
    conditions.push(eq(siteriseTrafficSnapshot.source, source));
  }

  if (displayDate) {
    conditions.push(eq(siteriseTrafficSnapshot.displayDate, displayDate));
  }

  const snapshots = await db()
    .select()
    .from(siteriseTrafficSnapshot)
    .where(and(...conditions))
    .orderBy(
      desc(siteriseTrafficSnapshot.displayDate),
      desc(siteriseTrafficSnapshot.fetchedAt)
    )
    .limit(50);

  const snapshot = pickBestSnapshot(snapshots, Boolean(displayDate));
  if (!snapshot) return null;

  return snapshotToTrafficSummary(snapshot, true);
}

export async function saveTrafficSummary({
  rootDomain,
  hostname,
  country,
  displayDate,
  result,
}: SaveTrafficSummaryInput): Promise<TrafficSummaryResult> {
  const domain = await upsertSiteRiseDomain({
    rootDomain,
    hostname,
    source: result.source,
  });

  return saveTrafficSummaryForDomain({
    domainId: domain.id,
    rootDomain,
    country,
    displayDate,
    result,
  });
}

export async function saveTrafficSummaries({
  rootDomain,
  hostname,
  country,
  displayDate,
  results,
}: SaveTrafficSummariesInput): Promise<TrafficSummaryResult[]> {
  if (results.length === 0) return [];

  const domain = await upsertSiteRiseDomain({
    rootDomain,
    hostname,
    source: results[0].source,
  });

  const saved: TrafficSummaryResult[] = [];

  for (const result of results) {
    saved.push(
      await saveTrafficSummaryForDomain({
        domainId: domain.id,
        rootDomain,
        country,
        displayDate,
        result,
      })
    );
  }

  return saved;
}

export async function saveTrafficSummariesForDomain({
  domainId,
  rootDomain,
  country,
  displayDate,
  results,
}: SaveTrafficSummariesForDomainInput): Promise<TrafficSummaryResult[]> {
  const saved: TrafficSummaryResult[] = [];

  for (const result of results) {
    saved.push(
      await saveTrafficSummaryForDomain({
        domainId,
        rootDomain,
        country,
        displayDate,
        result,
      })
    );
  }

  return saved;
}

async function saveTrafficSummaryForDomain({
  domainId,
  rootDomain,
  country,
  displayDate,
  result,
}: {
  domainId: string;
  rootDomain: string;
  country: string;
  displayDate?: string;
  result: TrafficSummaryResult;
}): Promise<TrafficSummaryResult> {
  const snapshotDisplayDate = normalizeDisplayDate(result.month || displayDate);
  const normalizedCountry = normalizeCountry(result.country || country);
  const cacheUntil = result.cachedUntil
    ? new Date(result.cachedUntil)
    : getDefaultCacheUntil();

  const [snapshot] = await db()
    .insert(siteriseTrafficSnapshot)
    .values({
      id: getUuid(),
      domainId,
      rootDomain,
      displayDate: snapshotDisplayDate,
      country: normalizedCountry,
      deviceType: DEFAULT_DEVICE_TYPE,
      source: result.source,
      visits: result.metrics.visits,
      users: result.metrics.users,
      desktopVisits: result.metrics.desktopVisits,
      mobileVisits: result.metrics.mobileVisits,
      bounceRate: result.metrics.bounceRate,
      pagesPerVisit: result.metrics.pagesPerVisit,
      timeOnSite: result.metrics.timeOnSite,
      accuracy: result.metrics.accuracy,
      raw: result.raw,
      fetchedAt: new Date(),
      cacheUntil,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        siteriseTrafficSnapshot.domainId,
        siteriseTrafficSnapshot.displayDate,
        siteriseTrafficSnapshot.country,
        siteriseTrafficSnapshot.deviceType,
        siteriseTrafficSnapshot.source,
      ],
      set: {
        rootDomain,
        visits: result.metrics.visits,
        users: result.metrics.users,
        desktopVisits: result.metrics.desktopVisits,
        mobileVisits: result.metrics.mobileVisits,
        bounceRate: result.metrics.bounceRate,
        pagesPerVisit: result.metrics.pagesPerVisit,
        timeOnSite: result.metrics.timeOnSite,
        accuracy: result.metrics.accuracy,
        raw: result.raw,
        fetchedAt: new Date(),
        cacheUntil,
        updatedAt: new Date(),
      },
    })
    .returning();

  return snapshotToTrafficSummary(snapshot, false);
}

export async function logTrafficQuery({
  userId,
  ip,
  endpoint,
  targets,
  country,
  displayDate,
  status,
  errorCode,
  latencyMs,
  cached = false,
  provider = DEFAULT_SOURCE,
}: LogTrafficQueryInput) {
  await db()
    .insert(siteriseTrafficQueryLog)
    .values({
      id: getUuid(),
      userId: userId || null,
      ipHash: userId ? null : hashIp(ip),
      endpoint,
      provider,
      targets,
      targetCount: targets.length || 1,
      country: normalizeCountry(country),
      displayDate: displayDate || null,
      status,
      errorCode,
      latencyMs,
      cached,
    });
}

export async function upsertSeedDomain(input: UpsertSeedDomainInput) {
  const metadata = {
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };

  const [domain] = await db()
    .insert(siteriseDomain)
    .values({
      id: getUuid(),
      rootDomain: input.rootDomain,
      hostname: input.hostname || input.rootDomain,
      tld: getTld(input.rootDomain),
      title: emptyToNull(input.title),
      description: emptyToNull(input.description),
      category: emptyToNull(input.category),
      country: normalizeCountry(input.country || undefined),
      firstSeenAt: new Date(),
      registeredAt: input.registeredAt || null,
      source: DEFAULT_SOURCE,
      status: 'active',
      metadata: Object.keys(metadata).length ? metadata : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteriseDomain.rootDomain,
      set: {
        hostname: input.hostname || input.rootDomain,
        tld: getTld(input.rootDomain),
        title: emptyToNull(input.title),
        description: emptyToNull(input.description),
        category: emptyToNull(input.category),
        country: normalizeCountry(input.country || undefined),
        registeredAt: input.registeredAt || null,
        source: DEFAULT_SOURCE,
        status: 'active',
        metadata: Object.keys(metadata).length ? metadata : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return domain as SiteRiseDomainRow;
}

export async function upsertTrafficImportDomain(
  input: UpsertTrafficImportDomainInput
) {
  const [currentDomain] = await db()
    .select()
    .from(siteriseDomain)
    .where(eq(siteriseDomain.rootDomain, input.rootDomain))
    .limit(1);

  const nextMetadata = mergeMetadata(
    currentDomain?.metadata,
    mergeMetadata(
      input.metadata || null,
      buildSourceMetadata({
        sourceUrl: input.sourceUrl,
        notes: input.notes,
      })
    )
  );
  const source = input.source || DEFAULT_SOURCE;

  if (!currentDomain) {
    const [domain] = await db()
      .insert(siteriseDomain)
      .values({
        id: getUuid(),
        rootDomain: input.rootDomain,
        hostname: input.hostname || input.rootDomain,
        tld: getTld(input.rootDomain),
        title: emptyToNull(input.title),
        description: emptyToNull(input.description),
        category: emptyToNull(input.category),
        country: normalizeCountry(input.country || undefined),
        firstSeenAt: new Date(),
        registeredAt: input.registeredAt || null,
        source,
        status: 'active',
        metadata: nextMetadata,
        updatedAt: new Date(),
      })
      .returning();

    return domain as SiteRiseDomainRow;
  }

  const updatePayload: Partial<typeof siteriseDomain.$inferInsert> = {
    hostname: input.hostname || currentDomain.hostname || input.rootDomain,
    tld: getTld(input.rootDomain),
    source: currentDomain.source,
    status: 'active',
    metadata: nextMetadata,
    updatedAt: new Date(),
  };

  if (input.title !== undefined) {
    updatePayload.title = emptyToNull(input.title);
  }
  if (input.description !== undefined) {
    updatePayload.description = emptyToNull(input.description);
  }
  if (input.category !== undefined) {
    updatePayload.category = emptyToNull(input.category);
  }
  if (input.country !== undefined) {
    updatePayload.country = normalizeCountry(input.country || undefined);
  }
  if (input.registeredAt) {
    updatePayload.registeredAt = input.registeredAt;
  }

  const [domain] = await db()
    .update(siteriseDomain)
    .set(updatePayload)
    .where(eq(siteriseDomain.id, currentDomain.id))
    .returning();

  return domain as SiteRiseDomainRow;
}

export async function upsertDiscoveredDomain(
  input: UpsertDiscoveredDomainInput
) {
  const [currentDomain] = await db()
    .select()
    .from(siteriseDomain)
    .where(eq(siteriseDomain.rootDomain, input.rootDomain))
    .limit(1);

  if (currentDomain?.status === 'blocked') {
    return currentDomain as SiteRiseDomainRow;
  }

  if (currentDomain?.status === 'active' && input.status !== 'active') {
    return currentDomain as SiteRiseDomainRow;
  }

  const nextMetadata = mergeMetadata(
    currentDomain?.metadata,
    mergeMetadata(
      input.metadata || null,
      buildSourceMetadata({
        sourceUrl: input.sourceUrl,
        notes: input.notes,
      })
    )
  );
  const nextStatus =
    currentDomain?.status === 'active' ? 'active' : input.status;
  const source = input.source || currentDomain?.source || DEFAULT_SOURCE;

  if (!currentDomain) {
    const [domain] = await db()
      .insert(siteriseDomain)
      .values({
        id: getUuid(),
        rootDomain: input.rootDomain,
        hostname: input.hostname || input.rootDomain,
        tld: getTld(input.rootDomain),
        title: emptyToNull(input.title),
        description: emptyToNull(input.description),
        category: emptyToNull(input.category),
        country: normalizeCountry(input.country || undefined),
        firstSeenAt: new Date(),
        registeredAt: input.registeredAt || null,
        source,
        status: nextStatus,
        metadata: nextMetadata,
        updatedAt: new Date(),
      })
      .returning();

    return domain as SiteRiseDomainRow;
  }

  const updatePayload: Partial<typeof siteriseDomain.$inferInsert> = {
    hostname: input.hostname || currentDomain.hostname || input.rootDomain,
    tld: getTld(input.rootDomain),
    source: currentDomain.source || source,
    status: nextStatus,
    metadata: nextMetadata,
    updatedAt: new Date(),
  };

  if (input.title !== undefined) {
    updatePayload.title = emptyToNull(input.title);
  }
  if (input.description !== undefined) {
    updatePayload.description = emptyToNull(input.description);
  }
  if (input.category !== undefined) {
    updatePayload.category = emptyToNull(input.category);
  }
  if (input.country !== undefined) {
    updatePayload.country = normalizeCountry(input.country || undefined);
  }
  if (input.registeredAt) {
    updatePayload.registeredAt = input.registeredAt;
  }

  const [domain] = await db()
    .update(siteriseDomain)
    .set(updatePayload)
    .where(eq(siteriseDomain.id, currentDomain.id))
    .returning();

  return domain as SiteRiseDomainRow;
}

export async function getSiteRiseDomainsByRootDomains(
  rootDomains: string[]
): Promise<Map<string, SiteRiseDomainStatusView>> {
  const domains = Array.from(
    new Set(
      rootDomains
        .map((domain) =>
          String(domain || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )
  );

  if (domains.length === 0) {
    return new Map<string, SiteRiseDomainStatusView>();
  }

  const rows = (await db()
    .select({
      id: siteriseDomain.id,
      rootDomain: siteriseDomain.rootDomain,
      status: siteriseDomain.status,
      registeredAt: siteriseDomain.registeredAt,
      metadata: siteriseDomain.metadata,
    })
    .from(siteriseDomain)
    .where(inArray(siteriseDomain.rootDomain, domains))) as Array<{
    id: string;
    rootDomain: string;
    status: string;
    registeredAt: Date | null;
    metadata: Record<string, unknown> | null;
  }>;

  return new Map(
    rows.map((row) => [
      row.rootDomain,
      {
        id: row.id,
        rootDomain: row.rootDomain,
        status: row.status,
        registeredAt: row.registeredAt,
        metadata: row.metadata || null,
      },
    ])
  );
}

export async function getTrafficRefreshCandidates({
  limit = 50,
  staleOnly = true,
  country = DEFAULT_COUNTRY,
  source = DEFAULT_SOURCE,
}: {
  limit?: number;
  staleOnly?: boolean;
  country?: string;
  source?: TrafficDataSource;
} = {}): Promise<TrafficRefreshCandidate[]> {
  const normalizedCountry = normalizeCountry(country);

  if (!staleOnly) {
    return db()
      .select({
        id: siteriseDomain.id,
        rootDomain: siteriseDomain.rootDomain,
        hostname: siteriseDomain.hostname,
      })
      .from(siteriseDomain)
      .where(eq(siteriseDomain.status, 'active'))
      .orderBy(asc(siteriseDomain.createdAt))
      .limit(limit);
  }

  const freshRows = await db()
    .select({
      domainId: siteriseTrafficSnapshot.domainId,
    })
    .from(siteriseTrafficSnapshot)
    .where(
      and(
        eq(siteriseTrafficSnapshot.country, normalizedCountry),
        eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE),
        eq(siteriseTrafficSnapshot.source, source),
        gt(siteriseTrafficSnapshot.cacheUntil, new Date())
      )
    )
    .limit(5000);

  const freshIds: string[] = Array.from(
    new Set(freshRows.map((row: { domainId: string }) => row.domainId))
  );
  const conditions: any[] = [eq(siteriseDomain.status, 'active')];

  if (freshIds.length > 0) {
    conditions.push(notInArrayCompat(siteriseDomain.id, freshIds));
  }

  return db()
    .select({
      id: siteriseDomain.id,
      rootDomain: siteriseDomain.rootDomain,
      hostname: siteriseDomain.hostname,
    })
    .from(siteriseDomain)
    .where(and(...conditions))
    .orderBy(asc(siteriseDomain.updatedAt))
    .limit(limit);
}

export async function getWhoisRefreshCandidates({
  limit = 50,
  missingOnly = true,
}: {
  limit?: number;
  missingOnly?: boolean;
} = {}): Promise<WhoisRefreshCandidate[]> {
  const conditions: any[] = [eq(siteriseDomain.status, 'active')];

  if (missingOnly) {
    conditions.push(isNull(siteriseDomain.registeredAt));
  }

  return db()
    .select({
      id: siteriseDomain.id,
      rootDomain: siteriseDomain.rootDomain,
      hostname: siteriseDomain.hostname,
    })
    .from(siteriseDomain)
    .where(and(...conditions))
    .orderBy(asc(siteriseDomain.updatedAt))
    .limit(limit);
}

export async function updateDomainWhois({
  domainId,
  registeredAt,
  title,
  description,
  metadata,
}: {
  domainId: string;
  registeredAt?: Date | null;
  title?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const [currentDomain] = await db()
    .select({
      metadata: siteriseDomain.metadata,
    })
    .from(siteriseDomain)
    .where(eq(siteriseDomain.id, domainId))
    .limit(1);

  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
    metadata: mergeMetadata(currentDomain?.metadata, metadata),
  };

  if (registeredAt) {
    updatePayload.registeredAt = registeredAt;
  }
  if (title !== undefined) {
    updatePayload.title = emptyToNull(title);
  }
  if (description !== undefined) {
    updatePayload.description = emptyToNull(description);
  }

  const [domain] = await db()
    .update(siteriseDomain)
    .set(updatePayload)
    .where(eq(siteriseDomain.id, domainId))
    .returning();

  return domain as SiteRiseDomainRow | undefined;
}

export async function findCachedDomainWhois({
  rootDomain,
  allowStale = false,
}: {
  rootDomain: string;
  allowStale?: boolean;
}): Promise<DomainWhoisCacheView | null> {
  const [domain] = await db()
    .select({
      registeredAt: siteriseDomain.registeredAt,
    })
    .from(siteriseDomain)
    .where(eq(siteriseDomain.rootDomain, rootDomain))
    .limit(1);
  const [cache] = await db()
    .select()
    .from(siteriseDomainWhoisCache)
    .where(eq(siteriseDomainWhoisCache.rootDomain, rootDomain))
    .limit(1);

  const cached = cache
    ? mapWhoisCacheRow(cache, domain?.registeredAt || null)
    : null;
  if (!cached) return null;
  if (!allowStale && cached.cachedUntil.getTime() <= Date.now()) {
    return null;
  }

  return cached;
}

export async function saveDomainWhoisCache({
  rootDomain,
  hostname,
  result,
  cacheTtlDays = getWhoisCacheTtlDays(),
}: {
  rootDomain: string;
  hostname?: string | null;
  result: WhoisLookupResult;
  cacheTtlDays?: number;
}): Promise<DomainWhoisCacheView> {
  const now = new Date();
  const cachedUntil = addDays(now, cacheTtlDays);
  const cachePayload = {
    source: result.source,
    registeredAt: result.registeredAt,
    expiresAt: result.expiresAt,
    domainUpdatedAt: result.updatedAt,
    registrar: result.registrar,
    status: result.status,
    nameservers: result.nameservers,
    rdapServer: result.rdapServer || null,
    raw: result.raw,
    fetchedAt: now,
    cacheUntil: cachedUntil,
    errorCode: null,
    errorMessage: null,
    updatedAt: now,
  };

  const [currentDomain] = await db()
    .select()
    .from(siteriseDomain)
    .where(eq(siteriseDomain.rootDomain, rootDomain))
    .limit(1);

  if (!currentDomain) {
    await db()
      .insert(siteriseDomain)
      .values({
        id: getUuid(),
        rootDomain,
        hostname: hostname || rootDomain,
        tld: getTld(rootDomain),
        firstSeenAt: now,
        registeredAt: result.registeredAt || null,
        source: DEFAULT_SOURCE,
        status: 'candidate',
        updatedAt: now,
      });
  } else {
    const updatePayload: Partial<typeof siteriseDomain.$inferInsert> = {
      hostname: hostname || currentDomain.hostname || rootDomain,
      tld: getTld(rootDomain),
      updatedAt: now,
    };

    if (result.registeredAt) {
      updatePayload.registeredAt = result.registeredAt;
    }

    await db()
      .update(siteriseDomain)
      .set(updatePayload)
      .where(eq(siteriseDomain.id, currentDomain.id));
  }

  const [cache] = await db()
    .insert(siteriseDomainWhoisCache)
    .values({
      id: getUuid(),
      rootDomain,
      ...cachePayload,
    })
    .onConflictDoUpdate({
      target: siteriseDomainWhoisCache.rootDomain,
      set: cachePayload,
    })
    .returning();

  return {
    ...mapWhoisCacheRow(cache, result.registeredAt),
    cached: false,
  };
}

export async function buildGrowthLeaderboard({
  displayDate,
  country = DEFAULT_COUNTRY,
  category,
  minVisits = 1000,
  minPreviousVisits = 100,
  limit = 100,
  source = DEFAULT_SOURCE,
}: {
  displayDate?: string;
  country?: string;
  category?: string;
  minVisits?: number;
  minPreviousVisits?: number;
  limit?: number;
  source?: TrafficDataSource;
}) {
  const normalizedCountry = normalizeCountry(country);
  const month =
    normalizeOptionalDisplayDate(displayDate) ||
    (await getLatestSnapshotMonth({
      country: normalizedCountry,
      source: normalizeSource(source),
    })) ||
    getCurrentMonthStart();
  const previousMonth = getPreviousMonthStart(month);

  const currentSnapshots = (await db()
    .select()
    .from(siteriseTrafficSnapshot)
    .where(
      and(
        eq(siteriseTrafficSnapshot.displayDate, month),
        eq(siteriseTrafficSnapshot.country, normalizedCountry),
        eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE),
        eq(siteriseTrafficSnapshot.source, source),
        gte(siteriseTrafficSnapshot.visits, minVisits)
      )
    )) as TrafficSnapshotRow[];

  const previousSnapshots = (await db()
    .select()
    .from(siteriseTrafficSnapshot)
    .where(
      and(
        eq(siteriseTrafficSnapshot.displayDate, previousMonth),
        eq(siteriseTrafficSnapshot.country, normalizedCountry),
        eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE),
        eq(siteriseTrafficSnapshot.source, source),
        gte(siteriseTrafficSnapshot.visits, minPreviousVisits)
      )
    )) as TrafficSnapshotRow[];

  const previousByDomain = new Map(
    previousSnapshots.map((snapshot: TrafficSnapshotRow) => [
      snapshot.domainId,
      snapshot,
    ])
  );
  const domainsById = await getDomainsByIds(
    currentSnapshots.map((snapshot: TrafficSnapshotRow) => snapshot.domainId)
  );

  const entries = currentSnapshots
    .map((current: TrafficSnapshotRow) => {
      const previous = previousByDomain.get(current.domainId);
      if (!previous?.visits || !current.visits) return null;
      const domain = domainsById.get(current.domainId);
      if (domain?.status !== 'active') return null;
      if (category && domain?.category !== category) return null;

      const visitsDelta = current.visits - previous.visits;
      if (visitsDelta <= 0) return null;

      const growthRate = visitsDelta / previous.visits;
      const score = getGrowthScore({
        visits: current.visits,
        visitsDelta,
        growthRate,
      });

      return {
        domainId: current.domainId,
        rootDomain: current.rootDomain,
        visits: current.visits,
        previousVisits: previous.visits,
        visitsDelta,
        growthRate,
        score,
        signal: getGrowthSignal(growthRate),
        metadata: {
          category: domain?.category || null,
          registeredAt: formatNullableDate(domain?.registeredAt),
        },
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const scoreDelta = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return Number(b.visitsDelta || 0) - Number(a.visitsDelta || 0);
    })
    .slice(0, limit)
    .map((entry: any, index: number) => ({
      ...entry,
      rank: index + 1,
    }));

  return saveLeaderboardRun({
    kind: 'growth',
    displayDate: month,
    country: normalizedCountry,
    category,
    source: normalizeSource(source),
    minVisits,
    entries,
    metadata: {
      previousMonth,
      minPreviousVisits,
    },
  });
}

export async function buildNewWebsiteLeaderboard({
  displayDate,
  country = DEFAULT_COUNTRY,
  category,
  rangeDays = 30,
  minVisits = 0,
  limit = 100,
  source = DEFAULT_SOURCE,
}: {
  displayDate?: string;
  country?: string;
  category?: string;
  rangeDays?: number;
  minVisits?: number;
  limit?: number;
  source?: TrafficDataSource;
}) {
  const normalizedCountry = normalizeCountry(country);
  const month =
    normalizeOptionalDisplayDate(displayDate) ||
    (await getLatestSnapshotMonth({
      country: normalizedCountry,
      source,
    })) ||
    getCurrentMonthStart();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - rangeDays);

  const snapshots = (await db()
    .select()
    .from(siteriseTrafficSnapshot)
    .where(
      and(
        eq(siteriseTrafficSnapshot.displayDate, month),
        eq(siteriseTrafficSnapshot.country, normalizedCountry),
        eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE),
        eq(siteriseTrafficSnapshot.source, source),
        gte(siteriseTrafficSnapshot.visits, minVisits)
      )
    )) as TrafficSnapshotRow[];

  const domainsById = await getDomainsByIds(
    snapshots.map((snapshot: TrafficSnapshotRow) => snapshot.domainId)
  );

  const entries = snapshots
    .map((snapshot: TrafficSnapshotRow) => {
      const domain = domainsById.get(snapshot.domainId);
      if (domain?.status !== 'active') return null;
      const registeredAt = domain?.registeredAt;
      if (!registeredAt || registeredAt < since) return null;
      if (category && domain?.category !== category) return null;

      return {
        domainId: snapshot.domainId,
        rootDomain: snapshot.rootDomain,
        visits: snapshot.visits,
        previousVisits: null,
        visitsDelta: null,
        growthRate: null,
        score: snapshot.visits || 0,
        signal: getNewWebsiteSignal(registeredAt),
        metadata: {
          category: domain?.category || null,
          registeredAt: formatNullableDate(registeredAt),
          rangeDays,
        },
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Number(b.visits || 0) - Number(a.visits || 0))
    .slice(0, limit)
    .map((entry: any, index: number) => ({
      ...entry,
      rank: index + 1,
    }));

  return saveLeaderboardRun({
    kind: 'new',
    displayDate: month,
    country: normalizedCountry,
    category,
    source,
    minVisits,
    entries,
    metadata: {
      rangeDays,
    },
  });
}

export async function getLeaderboardView({
  kind,
  displayDate,
  country = DEFAULT_COUNTRY,
  category,
  rangeDays,
  limit,
  isAuthenticated,
}: {
  kind: SiteRiseLeaderboardKind;
  displayDate?: string;
  country?: string;
  category?: string;
  rangeDays?: number;
  limit?: number;
  isAuthenticated: boolean;
}): Promise<LeaderboardView> {
  const normalizedLimit = clampNumber(
    limit || 20,
    1,
    isAuthenticated ? 100 : 20
  );
  const normalizedCountry = normalizeCountry(country);
  const month =
    normalizeOptionalDisplayDate(displayDate) ||
    (await getLatestLeaderboardMonth({
      kind,
      country: normalizedCountry,
      category,
    })) ||
    getCurrentMonthStart();
  const run = await findLeaderboardRun({
    kind,
    displayDate: month,
    country: normalizedCountry,
    category,
  });

  if (!run) {
    return {
      kind,
      month,
      country: normalizedCountry,
      category: category || null,
      range: kind === 'new' ? rangeDays || 30 : null,
      limit: normalizedLimit,
      isPreview: !isAuthenticated,
      generatedAt: null,
      entries: [],
    };
  }

  const effectiveRangeDays =
    kind === 'new' ? rangeDays || getRunRangeDays(run) : null;
  const rowLimit = kind === 'new' ? 100 : normalizedLimit;
  const rows = await db()
    .select({
      entry: siteriseLeaderboardEntry,
      domain: siteriseDomain,
    })
    .from(siteriseLeaderboardEntry)
    .leftJoin(
      siteriseDomain,
      eq(siteriseLeaderboardEntry.domainId, siteriseDomain.id)
    )
    .where(eq(siteriseLeaderboardEntry.runId, run.id))
    .orderBy(asc(siteriseLeaderboardEntry.rank))
    .limit(rowLimit);

  const rootDomains = rows.map(
    (row: { entry: SiteRiseLeaderboardEntryRow }) => row.entry.rootDomain
  );
  const trends = await getMonthlyTrendsByRootDomains(rootDomains, 10);

  const entries = rows.map(
    ({
      entry,
      domain,
    }: {
      entry: SiteRiseLeaderboardEntryRow;
      domain: SiteRiseDomainRow | null;
    }) => ({
      rank: entry.rank,
      rootDomain: entry.rootDomain,
      visits: entry.visits,
      previousVisits: entry.previousVisits,
      visitsDelta: entry.visitsDelta,
      growthRate: entry.growthRate,
      score: entry.score,
      signal: entry.signal,
      category:
        domain?.category ||
        getMetadataString(entry.metadata, 'category') ||
        null,
      registeredAt:
        formatNullableDate(domain?.registeredAt) ||
        getMetadataString(entry.metadata, 'registeredAt'),
      monthlyTrend: trends.get(entry.rootDomain) || [],
    })
  );
  const filteredEntries = filterLeaderboardEntriesByRange({
    kind,
    entries,
    rangeDays: effectiveRangeDays,
  })
    .slice(0, normalizedLimit)
    .map((entry, index) => ({
      ...entry,
      rank: kind === 'new' ? index + 1 : entry.rank,
    }));

  return {
    kind,
    month,
    country: normalizedCountry,
    category: category || null,
    range: effectiveRangeDays,
    limit: normalizedLimit,
    isPreview: !isAuthenticated,
    generatedAt: run.finishedAt
      ? run.finishedAt.toISOString()
      : run.createdAt.toISOString(),
    entries: filteredEntries,
  };
}

export async function getDomainDetailView({
  rootDomain,
  isAuthenticated,
}: {
  rootDomain: string;
  isAuthenticated: boolean;
}): Promise<DomainDetailView | null> {
  const [domain] = await db()
    .select()
    .from(siteriseDomain)
    .where(eq(siteriseDomain.rootDomain, rootDomain))
    .limit(1);

  if (!domain) return null;

  const trendLimit = isAuthenticated ? 10 : 4;
  const monthlyTrend = await getMonthlyTrendForDomain(domain.id, trendLimit);
  const current = monthlyTrend[monthlyTrend.length - 1];
  const previous = monthlyTrend[monthlyTrend.length - 2];
  const visitsDelta =
    typeof current?.visits === 'number' && typeof previous?.visits === 'number'
      ? current.visits - previous.visits
      : null;
  const growthRate =
    visitsDelta !== null && previous?.visits
      ? visitsDelta / previous.visits
      : null;

  const leaderboardRows = await db()
    .select({
      entry: siteriseLeaderboardEntry,
      run: siteriseLeaderboardRun,
    })
    .from(siteriseLeaderboardEntry)
    .leftJoin(
      siteriseLeaderboardRun,
      eq(siteriseLeaderboardEntry.runId, siteriseLeaderboardRun.id)
    )
    .where(eq(siteriseLeaderboardEntry.domainId, domain.id))
    .orderBy(desc(siteriseLeaderboardEntry.createdAt))
    .limit(isAuthenticated ? 10 : 3);

  return {
    rootDomain: domain.rootDomain,
    hostname: domain.hostname,
    title: domain.title,
    description: domain.description,
    category: domain.category,
    country: domain.country,
    registeredAt: formatNullableDate(domain.registeredAt),
    firstSeenAt: formatNullableDate(domain.firstSeenAt),
    source: domain.source,
    status: domain.status,
    monthlyTrend,
    growthRate,
    visitsDelta,
    leaderboardEntries: leaderboardRows
      .filter((row: { run: SiteRiseLeaderboardRunRow | null }) => row.run)
      .map(
        ({
          entry,
          run,
        }: {
          entry: SiteRiseLeaderboardEntryRow;
          run: SiteRiseLeaderboardRunRow | null;
        }) => ({
          kind: run?.kind || '',
          month: run ? formatDisplayDate(run.displayDate) : '',
          rank: entry.rank,
          growthRate: entry.growthRate,
          visits: entry.visits,
        })
      ),
    isPreview: !isAuthenticated,
  };
}

async function upsertSiteRiseDomain({
  rootDomain,
  hostname,
  source,
}: {
  rootDomain: string;
  hostname?: string;
  source: TrafficDataSource;
}) {
  const [domain] = await db()
    .insert(siteriseDomain)
    .values({
      id: getUuid(),
      rootDomain,
      hostname: hostname || rootDomain,
      tld: getTld(rootDomain),
      source,
      status: 'active',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteriseDomain.rootDomain,
      set: {
        hostname: hostname || rootDomain,
        tld: getTld(rootDomain),
        source: normalizeSource(source),
        status: 'active',
        updatedAt: new Date(),
      },
    })
    .returning();

  return domain;
}

async function saveLeaderboardRun({
  kind,
  displayDate,
  country,
  category,
  source,
  minVisits,
  entries,
  metadata,
}: {
  kind: SiteRiseLeaderboardKind;
  displayDate: string;
  country: string;
  category?: string;
  source: TrafficDataSource;
  minVisits: number;
  entries: Array<{
    domainId: string;
    rootDomain: string;
    rank: number;
    visits: number | null;
    previousVisits: number | null;
    visitsDelta: number | null;
    growthRate: number | null;
    score: number | null;
    signal: string | null;
    metadata: Record<string, unknown>;
  }>;
  metadata: Record<string, unknown>;
}) {
  let run = await findLeaderboardRun({
    kind,
    displayDate,
    country,
    category,
    source,
    includeUnready: true,
  });

  if (run) {
    const [updatedRun] = await db()
      .update(siteriseLeaderboardRun)
      .set({
        minVisits,
        status: 'running',
        startedAt: new Date(),
        finishedAt: null,
        error: null,
        metadata: {
          ...metadata,
          entryCount: entries.length,
        },
        updatedAt: new Date(),
      })
      .where(eq(siteriseLeaderboardRun.id, run.id))
      .returning();

    run = updatedRun || run;
  } else {
    const [insertedRun] = await db()
      .insert(siteriseLeaderboardRun)
      .values({
        id: getUuid(),
        kind,
        displayDate,
        country,
        category: category || null,
        source,
        minVisits,
        status: 'running',
        startedAt: new Date(),
        metadata: {
          ...metadata,
          entryCount: entries.length,
        },
        updatedAt: new Date(),
      })
      .returning();

    run = insertedRun;
  }

  if (!run) {
    throw new Error('Unable to create leaderboard run.');
  }

  await db()
    .delete(siteriseLeaderboardEntry)
    .where(eq(siteriseLeaderboardEntry.runId, run.id));

  if (entries.length > 0) {
    await db()
      .insert(siteriseLeaderboardEntry)
      .values(
        entries.map((entry) => ({
          id: getUuid(),
          runId: run.id,
          domainId: entry.domainId,
          rootDomain: entry.rootDomain,
          rank: entry.rank,
          visits: entry.visits,
          previousVisits: entry.previousVisits,
          visitsDelta: entry.visitsDelta,
          growthRate: entry.growthRate,
          score: entry.score,
          signal: entry.signal,
          metadata: entry.metadata,
        }))
      );
  }

  const [updatedRun] = await db()
    .update(siteriseLeaderboardRun)
    .set({
      status: 'ready',
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(siteriseLeaderboardRun.id, run.id))
    .returning();

  return {
    run: updatedRun || run,
    count: entries.length,
  };
}

async function findLeaderboardRun({
  kind,
  displayDate,
  country,
  category,
  source,
  includeUnready = false,
}: {
  kind: SiteRiseLeaderboardKind;
  displayDate: string;
  country: string;
  category?: string;
  source?: TrafficDataSource;
  includeUnready?: boolean;
}) {
  const conditions: any[] = [
    eq(siteriseLeaderboardRun.kind, kind),
    eq(siteriseLeaderboardRun.displayDate, displayDate),
    eq(siteriseLeaderboardRun.country, country),
    category
      ? eq(siteriseLeaderboardRun.category, category)
      : isNull(siteriseLeaderboardRun.category),
  ];

  if (source) {
    conditions.push(eq(siteriseLeaderboardRun.source, source));
  }

  if (!includeUnready) {
    conditions.push(eq(siteriseLeaderboardRun.status, 'ready'));
  }

  const runs = await db()
    .select()
    .from(siteriseLeaderboardRun)
    .where(and(...conditions))
    .orderBy(desc(siteriseLeaderboardRun.finishedAt))
    .limit(10);

  return pickPreferredLeaderboardRun(runs as SiteRiseLeaderboardRunRow[]);
}

async function getLatestLeaderboardMonth({
  kind,
  country,
  category,
  source,
}: {
  kind: SiteRiseLeaderboardKind;
  country: string;
  category?: string;
  source?: TrafficDataSource;
}) {
  const conditions: any[] = [
    eq(siteriseLeaderboardRun.kind, kind),
    eq(siteriseLeaderboardRun.country, country),
    category
      ? eq(siteriseLeaderboardRun.category, category)
      : isNull(siteriseLeaderboardRun.category),
    eq(siteriseLeaderboardRun.status, 'ready'),
  ];

  if (source) {
    conditions.push(eq(siteriseLeaderboardRun.source, source));
  }

  const runs = await db()
    .select()
    .from(siteriseLeaderboardRun)
    .where(and(...conditions))
    .orderBy(desc(siteriseLeaderboardRun.displayDate))
    .limit(10);

  const run = pickPreferredLeaderboardRun(runs as SiteRiseLeaderboardRunRow[]);
  return run?.displayDate ? formatDisplayDate(run.displayDate) : null;
}

async function getLatestSnapshotMonth({
  country,
  source = DEFAULT_SOURCE,
}: {
  country: string;
  source?: TrafficDataSource;
}) {
  const [snapshot] = await db()
    .select({ displayDate: siteriseTrafficSnapshot.displayDate })
    .from(siteriseTrafficSnapshot)
    .where(
      and(
        eq(siteriseTrafficSnapshot.country, country),
        eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE),
        eq(siteriseTrafficSnapshot.source, source)
      )
    )
    .orderBy(desc(siteriseTrafficSnapshot.displayDate))
    .limit(1);

  return snapshot?.displayDate ? formatDisplayDate(snapshot.displayDate) : null;
}

async function getDomainsByIds(
  ids: string[]
): Promise<Map<string, SiteRiseDomainRow>> {
  if (ids.length === 0) return new Map<string, SiteRiseDomainRow>();

  const domains = await db()
    .select()
    .from(siteriseDomain)
    .where(inArray(siteriseDomain.id, Array.from(new Set(ids))));

  return new Map(
    domains.map((domain: SiteRiseDomainRow) => [domain.id, domain])
  );
}

async function getMonthlyTrendsByRootDomains(
  rootDomains: string[],
  limit: number
) {
  const trends = new Map<
    string,
    Array<{ month: string; visits: number | null }>
  >();
  if (rootDomains.length === 0) return trends;

  const snapshots = await db()
    .select()
    .from(siteriseTrafficSnapshot)
    .where(
      and(
        inArray(
          siteriseTrafficSnapshot.rootDomain,
          Array.from(new Set(rootDomains))
        ),
        eq(siteriseTrafficSnapshot.country, DEFAULT_COUNTRY),
        eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE)
      )
    )
    .orderBy(desc(siteriseTrafficSnapshot.displayDate));

  for (const snapshot of snapshots as TrafficSnapshotRow[]) {
    const rows = trends.get(snapshot.rootDomain) || [];
    if (rows.length >= limit) continue;
    rows.push({
      month: formatDisplayDate(snapshot.displayDate),
      visits: snapshot.visits,
    });
    trends.set(snapshot.rootDomain, rows);
  }

  for (const [domain, rows] of trends) {
    trends.set(domain, rows.reverse());
  }

  return trends;
}

async function getMonthlyTrendForDomain(domainId: string, limit: number) {
  const snapshots = await db()
    .select()
    .from(siteriseTrafficSnapshot)
    .where(
      and(
        eq(siteriseTrafficSnapshot.domainId, domainId),
        eq(siteriseTrafficSnapshot.country, DEFAULT_COUNTRY),
        eq(siteriseTrafficSnapshot.deviceType, DEFAULT_DEVICE_TYPE)
      )
    )
    .orderBy(desc(siteriseTrafficSnapshot.displayDate))
    .limit(limit);

  return (snapshots as TrafficSnapshotRow[]).reverse().map((snapshot) => ({
    month: formatDisplayDate(snapshot.displayDate),
    visits: snapshot.visits,
  }));
}

function snapshotToTrafficSummary(
  snapshot: TrafficSnapshotRow,
  cached: boolean
): TrafficSummaryResult {
  return {
    domain: snapshot.rootDomain,
    country: snapshot.country,
    month: formatDisplayDate(snapshot.displayDate),
    source: normalizeSource(snapshot.source),
    cached,
    cachedUntil: snapshot.cacheUntil
      ? snapshot.cacheUntil.toISOString()
      : getDefaultCacheUntil().toISOString(),
    metrics: {
      visits: snapshot.visits,
      users: snapshot.users,
      desktopVisits: snapshot.desktopVisits,
      mobileVisits: snapshot.mobileVisits,
      bounceRate: snapshot.bounceRate,
      pagesPerVisit: snapshot.pagesPerVisit,
      timeOnSite: snapshot.timeOnSite,
      accuracy: snapshot.accuracy,
    } satisfies TrafficSummaryMetrics,
    raw: (snapshot.raw || {}) as Record<string, unknown>,
  };
}

function pickBestSnapshot(
  snapshots: TrafficSnapshotRow[],
  exactMonth: boolean
): TrafficSnapshotRow | undefined {
  return [...snapshots].sort((a, b) => {
    if (!exactMonth) {
      const dateDelta =
        new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime();
      if (dateDelta !== 0) return dateDelta;
    }

    const priorityDelta =
      getSourcePriority(a.source) - getSourcePriority(b.source);
    if (priorityDelta !== 0) return priorityDelta;

    return new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime();
  })[0];
}

function getSourcePriority(source: string) {
  const index = SOURCE_PRIORITY.indexOf(normalizeSource(source));
  return index === -1 ? SOURCE_PRIORITY.length : index;
}

function pickPreferredLeaderboardRun(runs: SiteRiseLeaderboardRunRow[]) {
  return [...runs].sort((a, b) => {
    const dateDelta =
      new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime();
    if (dateDelta !== 0) return dateDelta;

    const entryDelta = getRunEntryCount(b) - getRunEntryCount(a);
    if (entryDelta !== 0) return entryDelta;

    const sourceDelta =
      getSourcePriority(a.source) - getSourcePriority(b.source);
    if (sourceDelta !== 0) return sourceDelta;

    return (
      new Date(b.finishedAt || b.createdAt).getTime() -
      new Date(a.finishedAt || a.createdAt).getTime()
    );
  })[0];
}

function getRunEntryCount(run: SiteRiseLeaderboardRunRow) {
  const value = run.metadata?.entryCount;
  return typeof value === 'number' ? value : 0;
}

function normalizeSource(source?: string | null): TrafficDataSource {
  if (source && SOURCE_PRIORITY.includes(source as TrafficDataSource)) {
    return source as TrafficDataSource;
  }

  return DEFAULT_SOURCE;
}

function normalizeCountry(country?: string) {
  const value = String(country || '').trim();
  if (!value || value.toLowerCase() === DEFAULT_COUNTRY) return DEFAULT_COUNTRY;

  return value.toUpperCase();
}

function normalizeDisplayDate(value?: string | null) {
  if (!value) return getCurrentMonthStart();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getUTCFullYear()}-${String(
      parsed.getUTCMonth() + 1
    ).padStart(2, '0')}-01`;
  }

  return getCurrentMonthStart();
}

function normalizeOptionalDisplayDate(value?: string | null) {
  if (!value) return null;
  return normalizeDisplayDate(value);
}

function formatDisplayDate(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function getCurrentMonthStart() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}-01`;
}

function getDefaultCacheUntil() {
  const cacheUntil = new Date();
  cacheUntil.setUTCDate(cacheUntil.getUTCDate() + 30);
  return cacheUntil;
}

function getWhoisCacheTtlDays() {
  const configured = Number(process.env.WHOIS_CACHE_TTL_DAYS);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), 30)
    : DEFAULT_WHOIS_CACHE_TTL_DAYS;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function getTld(rootDomain: string) {
  return rootDomain.split('.').pop() || '';
}

function hashIp(ip?: string | null) {
  if (!ip) return null;
  return md5(ip);
}

function notInArrayCompat(column: any, values: string[]) {
  return notInArray(column, values);
}

function emptyToNull(value?: string | null) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function mergeMetadata(
  current?: Record<string, unknown> | null,
  next?: Record<string, unknown> | null
) {
  if (!current && !next) return null;
  return deepMerge(current || {}, next || {});
}

function deepMerge(
  current: Record<string, unknown>,
  next: Record<string, unknown>
) {
  const merged: Record<string, unknown> = { ...current };

  for (const [key, value] of Object.entries(next)) {
    const currentValue = merged[key];
    if (isPlainRecord(currentValue) && isPlainRecord(value)) {
      merged[key] = deepMerge(currentValue, value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function mapWhoisCacheRow(
  row: typeof siteriseDomainWhoisCache.$inferSelect,
  domainRegisteredAt?: Date | null
): DomainWhoisCacheView {
  return {
    domain: row.rootDomain,
    registeredAt: row.registeredAt || domainRegisteredAt || null,
    expiresAt: row.expiresAt,
    updatedAt: row.domainUpdatedAt,
    status: row.status,
    registrar: row.registrar,
    nameservers: row.nameservers || [],
    source: normalizeWhoisSource(row.source) || 'rdap',
    rdapServer: row.rdapServer,
    fetchedAt: row.fetchedAt,
    cachedUntil: row.cacheUntil,
    cached: true,
  };
}

function normalizeWhoisSource(value: unknown) {
  if (value === 'rdap' || value === 'query_domains') {
    return value;
  }
  return null;
}

function buildSourceMetadata({
  sourceUrl,
  notes,
}: {
  sourceUrl?: string | null;
  notes?: string | null;
}) {
  const metadata = {
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(notes ? { notes } : {}),
  };

  return Object.keys(metadata).length ? metadata : null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === 'object';
}

function formatNullableDate(value?: string | Date | null) {
  if (!value) return null;
  return formatDisplayDate(value);
}

function getPreviousMonthStart(month: string) {
  const date = new Date(`${month}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}-01`;
}

function getGrowthScore({
  visits,
  visitsDelta,
  growthRate,
}: {
  visits: number;
  visitsDelta: number;
  growthRate: number;
}) {
  const trafficWeight = Math.log10(Math.max(visits, 1));
  const deltaWeight = Math.log10(Math.max(visitsDelta, 1));
  return Number(
    (growthRate * 100 + trafficWeight * 8 + deltaWeight * 6).toFixed(2)
  );
}

function getGrowthSignal(growthRate: number) {
  if (growthRate >= 2) return 'Breakout growth';
  if (growthRate >= 1) return 'Fast acceleration';
  if (growthRate >= 0.5) return 'Strong momentum';
  return 'Rising';
}

function getNewWebsiteSignal(registeredAt: Date) {
  const ageDays = Math.max(
    0,
    Math.round((Date.now() - registeredAt.getTime()) / 86400000)
  );

  if (ageDays <= 14) return 'Newly registered';
  if (ageDays <= 30) return 'Fresh launch';
  if (ageDays <= 60) return 'Early traction';
  return 'Young site';
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' && value ? value : null;
}

function getRunRangeDays(run: SiteRiseLeaderboardRunRow, fallback?: number) {
  const value = run.metadata?.rangeDays;
  return typeof value === 'number' ? value : fallback || 30;
}

function filterLeaderboardEntriesByRange({
  kind,
  entries,
  rangeDays,
}: {
  kind: SiteRiseLeaderboardKind;
  entries: LeaderboardEntryView[];
  rangeDays: number | null;
}) {
  if (kind !== 'new' || !rangeDays) return entries;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - rangeDays);

  return entries.filter((entry) => {
    if (!entry.registeredAt) return false;
    const registeredAt = new Date(entry.registeredAt);
    return (
      !Number.isNaN(registeredAt.getTime()) &&
      registeredAt.getTime() >= since.getTime()
    );
  });
}
