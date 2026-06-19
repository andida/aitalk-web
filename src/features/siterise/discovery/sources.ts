import { readFileSync } from 'node:fs';
import { normalizeDomain } from '@/features/traffic/domain';

import type { DiscoveryCandidate } from './types';

type ProductHuntPost = {
  id?: string;
  name?: string;
  tagline?: string;
  description?: string;
  website?: string;
  productLinks?: Array<{
    type?: string;
    url?: string;
  }>;
  url?: string;
  slug?: string;
  createdAt?: string;
  featuredAt?: string;
  votesCount?: number;
  topics?: {
    edges?: Array<{
      node?: {
        name?: string;
        slug?: string;
      };
    }>;
  };
};

type ProductHuntResponse = {
  data?: {
    posts?: {
      nodes?: ProductHuntPost[];
      edges?: Array<{
        cursor?: string;
        node?: ProductHuntPost;
      }>;
      pageInfo?: {
        hasNextPage?: boolean;
        endCursor?: string | null;
      };
    };
  };
  errors?: Array<{ message?: string }>;
};

type HackerNewsItem = {
  id?: number;
  type?: string;
  title?: string;
  url?: string;
  text?: string;
  by?: string;
  time?: number;
};

export type ProductHuntDiscoveryStats = {
  daysScanned: number;
  pagesFetched: number;
  requestsRetried: number;
  requestsRateLimited: number;
  postsScanned: number;
  postsWithWebsite: number;
  productHuntRedirects: number;
  resolvedWebsites: number;
  unresolvedWebsites: number;
};

const DEFAULT_PRODUCT_HUNT_URL = 'https://api.producthunt.com/v2/api/graphql';
const DEFAULT_HACKER_NEWS_BASE = 'https://hacker-news.firebaseio.com/v0';
const PRODUCT_HUNT_PAGE_SIZE = 100;
const PRODUCT_HUNT_MAX_RETRIES = 4;

export async function getProductHuntCandidates({
  token,
  days,
  limit,
  stats,
}: {
  token: string;
  days: number;
  limit: number;
  stats?: ProductHuntDiscoveryStats;
}): Promise<DiscoveryCandidate[]> {
  const results: DiscoveryCandidate[] = [];
  const dayWindows = getProductHuntDayWindows(days);

  for (const dayWindow of dayWindows) {
    if (results.length >= limit) break;

    stats && (stats.daysScanned += 1);
    let after: string | null = null;

    while (results.length < limit) {
      const json = await fetchProductHuntPage({
        token,
        after,
        postedAfter: dayWindow.postedAfter,
        postedBefore: dayWindow.postedBefore,
        stats,
      });

      const posts = getProductHuntPosts(json);
      stats && (stats.postsScanned += posts.length);

      for (const node of posts) {
        const url = node?.website;
        if (!url) continue;
        stats && (stats.postsWithWebsite += 1);

        const externalUrl = findExternalProductHuntWebsite(node, stats);
        if (!externalUrl) {
          continue;
        }

        const normalized = normalizeDomain(externalUrl);
        stats && (stats.resolvedWebsites += 1);

        results.push({
          rootDomain: normalized.rootDomain,
          hostname: normalized.hostname,
          url: externalUrl,
          source: 'product_hunt',
          sourceUrl: node?.slug
            ? `https://www.producthunt.com/posts/${node.slug}`
            : node?.url || undefined,
          title: node?.name,
          description: node?.tagline || node?.description,
          category:
            node?.topics?.edges
              ?.map((edge) => edge.node?.name)
              .filter(Boolean)
              .slice(0, 1)[0] || undefined,
          metadata: {
            productHunt: {
              id: node?.id,
              createdAt: node?.createdAt || null,
              featuredAt: node?.featuredAt || null,
              votesCount: node?.votesCount || null,
              topics:
                node?.topics?.edges
                  ?.map((edge) => edge.node?.name)
                  .filter(Boolean) || [],
            },
          },
        });

        if (results.length >= limit) break;
      }

      const pageInfo = json.data?.posts?.pageInfo;
      if (!pageInfo?.hasNextPage) break;
      if (!pageInfo.endCursor || pageInfo.endCursor === after) break;
      after = pageInfo.endCursor;
    }
  }

  return dedupeCandidates(results);
}

async function fetchProductHuntPage({
  token,
  after,
  postedAfter,
  postedBefore,
  stats,
}: {
  token: string;
  after: string | null;
  postedAfter: string;
  postedBefore: string;
  stats?: ProductHuntDiscoveryStats;
}) {
  for (let attempt = 0; attempt <= PRODUCT_HUNT_MAX_RETRIES; attempt += 1) {
    const response = await fetch(DEFAULT_PRODUCT_HUNT_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query Posts($after: String, $first: Int!, $postedAfter: DateTime, $postedBefore: DateTime) {
            posts(first: $first, order: VOTES, after: $after, postedAfter: $postedAfter, postedBefore: $postedBefore) {
              nodes {
                id
                name
                tagline
                description
                website
                productLinks {
                  type
                  url
                }
                url
                slug
                createdAt
                featuredAt
                votesCount
                topics(first: 10) {
                  edges { node { name slug } }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        `,
        variables: {
          after,
          first: PRODUCT_HUNT_PAGE_SIZE,
          postedAfter,
          postedBefore,
        },
      }),
      cache: 'no-store',
    });
    stats && (stats.pagesFetched += 1);

    if (response.status === 429 && attempt < PRODUCT_HUNT_MAX_RETRIES) {
      stats && (stats.requestsRateLimited += 1);
      stats && (stats.requestsRetried += 1);
      await sleep(getRetryDelayMs(response, attempt));
      continue;
    }

    const json = (await response.json()) as ProductHuntResponse;
    if (!response.ok || json.errors?.length) {
      throw new Error(
        json.errors?.[0]?.message ||
          `Product Hunt request failed: ${response.status}`
      );
    }

    return json;
  }

  throw new Error('Product Hunt request failed after retries');
}

function findExternalProductHuntWebsite(
  post: ProductHuntPost,
  stats?: ProductHuntDiscoveryStats
) {
  const urls = [
    post.website,
    ...((post.productLinks || [])
      .filter((link) => isPrimaryProductHuntLink(link.type))
      .map((link) => link.url) || []),
    ...extractUrlsFromText(`${post.tagline || ''}\n${post.description || ''}`),
  ].filter(Boolean) as string[];

  let sawProductHuntRedirect = false;

  for (const url of urls) {
    try {
      const normalized = normalizeDomain(url);
      if (normalized.rootDomain !== 'producthunt.com') {
        return url;
      }

      if (isProductHuntRedirectUrl(url)) {
        sawProductHuntRedirect = true;
      }
    } catch {
      continue;
    }
  }

  if (sawProductHuntRedirect) {
    stats && (stats.productHuntRedirects += 1);
  }
  stats && (stats.unresolvedWebsites += 1);

  return null;
}

function isPrimaryProductHuntLink(type?: string) {
  const normalized = String(type || '').toLowerCase();
  return (
    !normalized ||
    ['website', 'app store', 'github', 'figma'].includes(normalized)
  );
}

function isProductHuntRedirectUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return hostname === 'producthunt.com' && parsed.pathname.startsWith('/r/');
  } catch {
    return false;
  }
}

function extractUrlsFromText(text: string) {
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  return matches.map((url) => url.replace(/[.,;:!?]+$/, ''));
}

function getRetryDelayMs(response: Response, attempt: number) {
  const retryAfter = response.headers.get('retry-after');
  const parsedSeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
    return Math.min(parsedSeconds * 1000, 30000);
  }

  if (retryAfter) {
    const retryAt = new Date(retryAfter).getTime();
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 1000), 30000);
    }
  }

  return Math.min(1500 * 2 ** attempt, 30000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProductHuntDayWindows(days: number) {
  const windowCount = Math.max(1, Math.floor(days));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: windowCount }, (_, offset) => {
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - offset);

    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);

    return {
      postedAfter: start.toISOString(),
      postedBefore: end.toISOString(),
    };
  });
}

function getProductHuntPosts(response: ProductHuntResponse) {
  const posts = response.data?.posts;
  if (!posts) return [];
  if (posts.nodes?.length) return posts.nodes;
  return posts.edges?.map((edge) => edge.node).filter(Boolean) || [];
}

export async function getHackerNewsCandidates({
  days,
  limit,
}: {
  days: number;
  limit: number;
}): Promise<DiscoveryCandidate[]> {
  const since = Math.floor((Date.now() - days * 86400000) / 1000);
  const endpoints = ['showstories', 'newstories'] as const;
  const ids = new Set<number>();

  for (const endpoint of endpoints) {
    const response = await fetch(
      `${DEFAULT_HACKER_NEWS_BASE}/${endpoint}.json`,
      { cache: 'no-store' }
    );
    if (!response.ok) {
      throw new Error(
        `Hacker News ${endpoint} request failed: ${response.status}`
      );
    }

    const data = (await response.json()) as number[];
    for (const id of data.slice(0, 200)) {
      ids.add(id);
    }
  }

  const candidates: DiscoveryCandidate[] = [];
  for (const id of Array.from(ids).slice(0, limit * 2)) {
    const response = await fetch(
      `${DEFAULT_HACKER_NEWS_BASE}/item/${id}.json`,
      {
        cache: 'no-store',
      }
    );
    if (!response.ok) continue;

    const item = (await response.json()) as HackerNewsItem;
    if (!item?.url || !item.time || item.time < since) continue;

    try {
      const normalized = normalizeDomain(item.url);
      candidates.push({
        rootDomain: normalized.rootDomain,
        hostname: normalized.hostname,
        url: item.url,
        source: 'hacker_news',
        sourceUrl: item.url,
        title: item.title,
        description: item.text,
        metadata: {
          hackerNews: {
            id: item.id,
            type: item.type,
            author: item.by,
            time: item.time,
          },
        },
      });
    } catch {
      continue;
    }

    if (candidates.length >= limit) break;
  }

  return dedupeCandidates(candidates);
}

export function getCandidateFileCandidates(
  filePath: string
): DiscoveryCandidate[] {
  const content = readFileSync(filePath, 'utf8');
  const rows = parseCsv(content);
  const candidates: DiscoveryCandidate[] = [];

  for (const row of rows) {
    const url = row.url || row.website || row.domain;
    if (!url) continue;

    try {
      const normalized = normalizeDomain(url);
      candidates.push({
        rootDomain: normalized.rootDomain,
        hostname: normalized.hostname,
        url,
        source: 'candidate_file',
        sourceUrl: row.source_url || row.sourceUrl || url,
        title: row.title || undefined,
        description: row.description || undefined,
        category: row.category || undefined,
        country: row.country || undefined,
        metadata: {
          candidateFile: {
            ...row,
          },
        },
      });
    } catch {
      continue;
    }
  }

  return dedupeCandidates(candidates);
}

export function getSimilarwebCsvCandidates(
  filePath: string
): DiscoveryCandidate[] {
  const content = readFileSync(filePath, 'utf8');
  const rows = parseCsv(content);
  const candidates: DiscoveryCandidate[] = [];

  for (const row of rows) {
    const url = row.website || row.domain || row.url;
    if (!url) continue;

    try {
      const normalized = normalizeDomain(url);
      candidates.push({
        rootDomain: normalized.rootDomain,
        hostname: normalized.hostname,
        url,
        source: 'similarweb_csv',
        sourceUrl: row.source_url || row.sourceUrl || url,
        title: row.title || undefined,
        description: row.description || undefined,
        category: row.category || undefined,
        country: row.country || undefined,
        metadata: {
          similarwebCsv: {
            ...row,
          },
        },
      });
    } catch {
      continue;
    }
  }

  return dedupeCandidates(candidates);
}

function dedupeCandidates(candidates: DiscoveryCandidate[]) {
  const byDomain = new Map<string, DiscoveryCandidate>();
  for (const candidate of candidates) {
    if (!byDomain.has(candidate.rootDomain)) {
      byDomain.set(candidate.rootDomain, candidate);
    }
  }
  return [...byDomain.values()];
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (quoted && char === '"' && next === '"') {
      field += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === ',') {
      row.push(field.trim());
      field = '';
      continue;
    }
    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field.trim());
      field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);

  const [headers = [], ...body] = rows;
  return body.map((values) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header.trim()] = values[index]?.trim() || '';
      return record;
    }, {})
  );
}
