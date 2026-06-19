#!/usr/bin/env tsx
import { runDiscoveryPipeline } from '@/features/siterise/discovery/pipeline';
import {
  getCandidateFileCandidates,
  getHackerNewsCandidates,
  getProductHuntCandidates,
  getSimilarwebCsvCandidates,
  type ProductHuntDiscoveryStats,
} from '@/features/siterise/discovery/sources';
import type {
  DiscoveryCandidate,
  DiscoveryRuntimeOptions,
} from '@/features/siterise/discovery/types';

import { closeDb } from '@/core/db';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const options = getOptions(args);
  const candidates: DiscoveryCandidate[] = [];

  if (options.productHuntEnabled) {
    try {
      const token = await getProductHuntAccessToken();
      if (!token) {
        console.warn(
          'Product Hunt discovery skipped: missing PRODUCT_HUNT_API_TOKEN or client credentials'
        );
      } else {
        const productHuntStats: ProductHuntDiscoveryStats = {
          daysScanned: 0,
          pagesFetched: 0,
          requestsRetried: 0,
          requestsRateLimited: 0,
          postsScanned: 0,
          postsWithWebsite: 0,
          productHuntRedirects: 0,
          resolvedWebsites: 0,
          unresolvedWebsites: 0,
        };
        const productHunt = await getProductHuntCandidates({
          token,
          days: options.days,
          limit: options.candidateLimit,
          stats: productHuntStats,
        });
        candidates.push(...productHunt);
        console.log(`Product Hunt domain candidates: ${productHunt.length}`);
        console.log(
          `Product Hunt scan: days=${productHuntStats.daysScanned}, pages=${productHuntStats.pagesFetched}, retries=${productHuntStats.requestsRetried}, rateLimited=${productHuntStats.requestsRateLimited}, posts=${productHuntStats.postsScanned}, withWebsite=${productHuntStats.postsWithWebsite}, redirects=${productHuntStats.productHuntRedirects}, resolved=${productHuntStats.resolvedWebsites}, unresolved=${productHuntStats.unresolvedWebsites}`
        );
      }
    } catch (error) {
      console.warn(
        `Product Hunt discovery failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  if (options.hackerNewsEnabled) {
    try {
      const hackerNews = await getHackerNewsCandidates({
        days: options.days,
        limit: Math.max(50, Math.floor(options.candidateLimit / 2)),
      });
      candidates.push(...hackerNews);
      console.log(`Hacker News candidates: ${hackerNews.length}`);
    } catch (error) {
      console.warn(
        `Hacker News discovery failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  if (options.similarwebCsvFile) {
    const similarwebCsv = getSimilarwebCsvCandidates(options.similarwebCsvFile);
    candidates.push(...similarwebCsv);
    console.log(`Category CSV candidates: ${similarwebCsv.length}`);
  }

  if (options.candidateFile) {
    const fileCandidates = getCandidateFileCandidates(options.candidateFile);
    candidates.push(...fileCandidates);
    console.log(`Candidate file candidates: ${fileCandidates.length}`);
  }

  const result = await runDiscoveryPipeline({
    candidates,
    options,
  });

  printResult(result);
}

type ProductHuntTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function getProductHuntAccessToken() {
  if (process.env.PRODUCT_HUNT_API_TOKEN) {
    return process.env.PRODUCT_HUNT_API_TOKEN;
  }

  const clientId =
    process.env.PRODUCTHUNT_CLIENT_ID || process.env.PRODUCT_HUNT_CLIENT_ID;
  const clientSecret =
    process.env.PRODUCTHUNT_CLIENT_SECRET ||
    process.env.PRODUCT_HUNT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const response = await fetch('https://api.producthunt.com/v2/oauth/token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  });

  const json = (await response.json()) as ProductHuntTokenResponse;
  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        `Product Hunt token request failed: ${response.status}`
    );
  }

  return json.access_token;
}

function getOptions(args: Record<string, any>): DiscoveryRuntimeOptions {
  return {
    days: parsePositiveInt(args.days, 90),
    candidateLimit: parsePositiveInt(args.candidateLimit, 500),
    trafficLimit: parseNonNegativeInt(
      args.trafficLimit ?? process.env.DISCOVERY_MAX_TRAFFIC_LOOKUPS,
      100
    ),
    minVisits: parseNonNegativeInt(
      args.minVisits ?? process.env.DISCOVERY_MIN_VISITS,
      1
    ),
    minDomainRating: parseNonNegativeNumber(
      args.minDr || process.env.DISCOVERY_MIN_DR,
      0
    ),
    country: normalizeCountry(args.country || 'global'),
    dryRun: Boolean(args.dryRun),
    buildLeaderboard: args.buildLeaderboard !== false,
    dnsTimeoutMs: parsePositiveInt(
      args.dnsTimeoutMs || process.env.DISCOVERY_DNS_TIMEOUT_MS,
      3000
    ),
    httpTimeoutMs: parsePositiveInt(
      args.httpTimeoutMs || process.env.DISCOVERY_HTTP_TIMEOUT_MS,
      6000
    ),
    productHuntEnabled:
      args.productHunt === false
        ? false
        : process.env.PRODUCT_HUNT_DISCOVERY_ENABLED !== 'false',
    hackerNewsEnabled: args.hackerNews !== false,
    similarwebCsvFile: args.similarwebCsv || args.categoryCsv,
    candidateFile: args.file || args.candidateFile,
  };
}

function printResult(result: Awaited<ReturnType<typeof runDiscoveryPipeline>>) {
  console.log(
    JSON.stringify(
      {
        stats: result.stats,
        accepted: result.decisions
          .filter((decision) => decision.accepted)
          .slice(0, 20),
        rejectedSummary: summarizeRejected(result.decisions),
      },
      null,
      2
    )
  );
}

function summarizeRejected(
  decisions: Awaited<ReturnType<typeof runDiscoveryPipeline>>['decisions']
) {
  return decisions
    .filter((decision) => !decision.accepted)
    .reduce<Record<string, number>>((summary, decision) => {
      summary[decision.reason] = (summary[decision.reason] || 0) + 1;
      return summary;
    }, {});
}

function parseArgs(args: string[]) {
  const parsed: Record<string, any> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (arg === '--no-build-leaderboard') {
      parsed.buildLeaderboard = false;
      continue;
    }
    if (arg === '--no-product-hunt') {
      parsed.productHunt = false;
      continue;
    }
    if (arg === '--no-hacker-news') {
      parsed.hackerNews = false;
      continue;
    }
    if (arg.startsWith('--')) {
      const [rawKey, inlineValue] = arg.slice(2).split('=');
      parsed[toCamelCase(rawKey)] = inlineValue ?? args[i + 1];
      if (inlineValue === undefined) i += 1;
    }
  }

  return parsed;
}

function normalizeCountry(value: string) {
  const country = String(value || '').trim();
  if (!country || country.toLowerCase() === 'global') return 'global';
  if (!/^[a-z]{2}$/i.test(country)) {
    throw new Error('country must be global or a two-letter code');
  }
  return country.toUpperCase();
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  const integer = Math.floor(parsed);
  return Number.isFinite(parsed) && integer > 0 ? integer : fallback;
}

function parseNonNegativeInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  const integer = Math.floor(parsed);
  return Number.isFinite(parsed) && integer >= 0 ? integer : fallback;
}

function parseNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toCamelCase(value: string) {
  return value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

main()
  .catch((error) => {
    console.error(formatError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(() => undefined);
  });

function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const details = [error.stack || error.message];
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause) {
    details.push(`Cause: ${formatError(cause)}`);
  }

  return details.join('\n');
}
