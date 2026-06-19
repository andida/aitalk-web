#!/usr/bin/env tsx
import type { TrafficDataSource } from '@/features/traffic/types';

import { closeDb } from '@/core/db';
import {
  buildGrowthLeaderboard,
  buildNewWebsiteLeaderboard,
} from '@/shared/models/siterise';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const kind = String(args.kind || 'all');
  const month = args.month ? String(args.month) : undefined;
  const country = String(args.country || 'global');
  const category = args.category ? String(args.category) : undefined;
  const limit = parsePositiveInt(args.limit, 100);
  const rangeDays = parseRangeDays(args.range, 30);
  const source = parseSource(args.source);

  if (kind !== 'all' && kind !== 'growth' && kind !== 'new') {
    throw new Error('kind must be one of: all, growth, new');
  }

  if (kind === 'all' || kind === 'growth') {
    const result = await buildGrowthLeaderboard({
      displayDate: month,
      country,
      category,
      limit,
      source,
    });
    console.log(`Built growth leaderboard with ${result.count} entries.`);
  }

  if (kind === 'all' || kind === 'new') {
    const result = await buildNewWebsiteLeaderboard({
      displayDate: month,
      country,
      category,
      rangeDays,
      limit,
      source,
    });
    console.log(`Built new website leaderboard with ${result.count} entries.`);
  }
}

function parseArgs(args: string[]) {
  const parsed: Record<string, any> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') continue;
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

function parseRangeDays(value: unknown, fallback: number) {
  const parsed = parsePositiveInt(value, fallback);
  return [30, 60, 90].includes(parsed) ? parsed : fallback;
}

function parseSource(value: unknown): TrafficDataSource | undefined {
  if (!value) return undefined;
  const source = String(value);
  if (
    source === 'query_domains' ||
    source === 'similarweb_public' ||
    source === 'similarweb_manual'
  ) {
    return source;
  }

  throw new Error(
    'source must be query_domains, similarweb_public, or similarweb_manual'
  );
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
