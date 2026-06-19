#!/usr/bin/env tsx
import { getQueryDomainsTrafficDataset } from '@/features/traffic/query-domains';

import { closeDb } from '@/core/db';
import {
  getTrafficRefreshCandidates,
  saveTrafficSummaries,
} from '@/shared/models/siterise';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = parsePositiveInt(args.limit, 50);
  const country = String(args.country || 'global');
  const staleOnly = args.all !== true;
  const delayMs = parsePositiveInt(args.delayMs, 400);
  const candidates = await getTrafficRefreshCandidates({
    limit,
    country,
    staleOnly,
  });

  console.log(
    `Refreshing ${candidates.length} domains (${staleOnly ? 'stale only' : 'all selected'}).`
  );

  let refreshed = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      if (args.dryRun) {
        console.log(`[dry-run] ${candidate.rootDomain}`);
      } else {
        const dataset = await getQueryDomainsTrafficDataset({
          target: candidate.rootDomain,
          country,
        });
        await saveTrafficSummaries({
          rootDomain: candidate.rootDomain,
          hostname: candidate.hostname || candidate.rootDomain,
          country,
          results: dataset.snapshots,
        });
        await sleep(delayMs);
      }

      refreshed += 1;
      console.log(`ok ${candidate.rootDomain}`);
    } catch (error) {
      failed += 1;
      console.warn(
        `failed ${candidate.rootDomain}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  console.log(
    `${args.dryRun ? 'Validated' : 'Refreshed'} ${refreshed} domains, failed ${failed}.`
  );
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
