#!/usr/bin/env tsx
import {
  lookupDomainWhois,
  type WhoisLookupResult,
} from '@/features/traffic/whois';

import { closeDb } from '@/core/db';
import {
  findCachedDomainWhois,
  getWhoisRefreshCandidates,
  saveDomainWhoisCache,
  type WhoisRefreshCandidate,
} from '@/shared/models/siterise';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = parsePositiveInt(args.limit, 50);
  const missingOnly = args.all !== true;
  const delayMs = parsePositiveInt(args.delayMs, 250);
  const batchSize = Math.min(parsePositiveInt(args.batchSize, 20), 20);
  const allowFallback = args.noFallback !== true;
  const forceRefresh = args.refresh === true;
  const candidates = await getWhoisRefreshCandidates({ limit, missingOnly });

  console.log(
    `Refreshing registration dates for ${candidates.length} domains (${missingOnly ? 'missing registration date only' : 'all selected'}).`
  );

  let refreshed = 0;
  let failed = 0;

  for (const batch of chunk(candidates, batchSize)) {
    if (args.dryRun) {
      for (const candidate of batch) {
        console.log(`[dry-run] ${candidate.rootDomain}`);
        refreshed += 1;
      }
      continue;
    }

    for (const candidate of batch) {
      if (args.dryRun) {
        console.log(`[dry-run] ${candidate.rootDomain}`);
      } else {
        try {
          const cached = forceRefresh
            ? null
            : await findCachedDomainWhois({
                rootDomain: candidate.rootDomain,
              });
          if (cached?.registeredAt) {
            refreshed += 1;
            console.log(`cached ${candidate.rootDomain} (${cached.source})`);
            continue;
          }

          const whois = await lookupDomainWhois(candidate.rootDomain, {
            allowFallback,
          });
          if (!whois.registeredAt) {
            throw new Error(
              'No registration date is available for this domain.'
            );
          }
          await saveWhoisResult(candidate, whois);

          refreshed += 1;
          console.log(`ok ${candidate.rootDomain} (${whois.source})`);
        } catch (error) {
          failed += 1;
          console.warn(
            `failed ${candidate.rootDomain}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`
          );
        }
      }
    }

    await sleep(delayMs);
  }

  console.log(
    `${args.dryRun ? 'Validated' : 'Refreshed'} registration dates for ${refreshed} domains, failed ${failed}.`
  );
}

async function saveWhoisResult(
  candidate: WhoisRefreshCandidate,
  whois: WhoisLookupResult
) {
  await saveDomainWhoisCache({
    rootDomain: candidate.rootDomain,
    hostname: candidate.hostname,
    result: whois,
  });
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
    if (arg === '--all') {
      parsed.all = true;
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

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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
