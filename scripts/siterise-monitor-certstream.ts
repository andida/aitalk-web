#!/usr/bin/env tsx
import { runDiscoveryPipeline } from '@/features/siterise/discovery/pipeline';
import type {
  DiscoveryCandidate,
  DiscoveryRuntimeOptions,
} from '@/features/siterise/discovery/types';
import { normalizeDomain } from '@/features/traffic/domain';

import { closeDb } from '@/core/db';

type CertStreamMessage = {
  message_type?: string;
  data?: {
    leaf_cert?: {
      all_domains?: string[];
    };
  };
};

async function main() {
  if (typeof WebSocket === 'undefined') {
    throw new Error('WebSocket is not available in this Node runtime.');
  }

  const args = parseArgs(process.argv.slice(2));
  const options = getOptions(args);
  const candidates = await collectCertstreamCandidates({
    url: process.env.CERTSTREAM_URL || 'wss://certstream.calidog.io',
    durationMs: parsePositiveInt(args.durationMin, 30) * 60_000,
    candidateLimit: options.candidateLimit,
  });

  console.log(`Certificate candidates: ${candidates.length}`);

  const result = await runDiscoveryPipeline({
    candidates,
    options,
  });

  console.log(
    JSON.stringify(
      {
        stats: result.stats,
        accepted: result.decisions
          .filter((decision) => decision.accepted)
          .slice(0, 20),
        rejectedSummary: result.decisions
          .filter((decision) => !decision.accepted)
          .reduce<Record<string, number>>((summary, decision) => {
            summary[decision.reason] = (summary[decision.reason] || 0) + 1;
            return summary;
          }, {}),
      },
      null,
      2
    )
  );
}

function collectCertstreamCandidates({
  url,
  durationMs,
  candidateLimit,
}: {
  url: string;
  durationMs: number;
  candidateLimit: number;
}) {
  return new Promise<DiscoveryCandidate[]>((resolve, reject) => {
    const ws = new WebSocket(url);
    const byDomain = new Map<string, DiscoveryCandidate>();
    const timeout = setTimeout(() => finish(), durationMs);

    ws.addEventListener('open', () => {
      console.log(`Connected to certificate stream: ${url}`);
    });

    ws.addEventListener('message', (event) => {
      const message = parseMessage(event.data);
      if (!message || message.message_type !== 'certificate_update') return;

      const domains = message.data?.leaf_cert?.all_domains || [];
      for (const rawDomain of domains) {
        const value = String(rawDomain || '')
          .replace(/^\*\./, '')
          .trim()
          .toLowerCase();
        if (!value || value.includes('*')) continue;

        try {
          const normalized = normalizeDomain(value);
          if (!byDomain.has(normalized.rootDomain)) {
            byDomain.set(normalized.rootDomain, {
              rootDomain: normalized.rootDomain,
              hostname: normalized.hostname,
              url: `https://${normalized.rootDomain}`,
              source: 'certstream',
              sourceUrl: `https://${normalized.rootDomain}`,
              metadata: {
                certstream: {
                  observedDomain: value,
                  observedAt: new Date().toISOString(),
                },
              },
            });
          }
        } catch {
          continue;
        }

        if (byDomain.size >= candidateLimit) {
          finish();
          return;
        }
      }
    });

    ws.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('certificate stream connection failed'));
    });

    ws.addEventListener('close', () => {
      finish();
    });

    function finish() {
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        // noop
      }
      resolve([...byDomain.values()]);
    }
  });
}

function getOptions(args: Record<string, any>): DiscoveryRuntimeOptions {
  return {
    days: parsePositiveInt(args.days, 90),
    candidateLimit: parsePositiveInt(args.candidateLimit, 1000),
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
    productHuntEnabled: false,
    hackerNewsEnabled: false,
  };
}

function parseMessage(data: unknown): CertStreamMessage | null {
  try {
    return JSON.parse(String(data)) as CertStreamMessage;
  } catch {
    return null;
  }
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
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(() => undefined);
  });
