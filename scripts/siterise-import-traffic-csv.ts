#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeDomain } from '@/features/traffic/domain';
import type {
  TrafficDataSource,
  TrafficSummaryResult,
} from '@/features/traffic/types';

import { closeDb } from '@/core/db';
import {
  saveTrafficSummariesForDomain,
  upsertTrafficImportDomain,
} from '@/shared/models/siterise';

type CsvRow = Record<string, string>;

type DomainImport = {
  domain: ReturnType<typeof normalizeDomain>;
  country: string;
  category?: string;
  registeredAt?: Date | null;
  title?: string;
  description?: string;
  sourceUrl?: string;
  notes?: string;
  snapshots: TrafficSummaryResult[];
};

const DEFAULT_SOURCE: TrafficDataSource = 'similarweb_manual';
const MONTH_HEADER_PATTERN = /^\d{4}-\d{2}(?:-01)?$/;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.file || args._[0];

  if (!file) {
    throw new Error(
      [
        'Usage: pnpm siterise:import-traffic-csv -- --file=data/traffic.csv',
        '',
        'Long format: domain,month,visits,country,registered_at,category,title,description,source_url,notes',
        'Wide format: domain,country,registered_at,category,2026-05-01,2026-04-01',
      ].join('\n')
    );
  }

  const source = parseSource(args.source);
  const defaultCountry = normalizeCountry(args.country || 'global');
  const cacheTtlDays = parsePositiveInt(args.cacheTtlDays, 30);
  const rows = parseCsv(readFileSync(resolve(file), 'utf8'));
  const imports = collectDomainImports({
    rows,
    source,
    defaultCountry,
    cacheTtlDays,
  });
  let importedDomains = 0;
  let importedSnapshots = 0;
  let skipped = 0;

  for (const item of imports.values()) {
    if (item.snapshots.length === 0) {
      skipped += 1;
      continue;
    }

    if (args.dryRun) {
      console.log(
        `[dry-run] ${item.domain.rootDomain}: ${item.snapshots.length} snapshots`
      );
    } else {
      const domain = await upsertTrafficImportDomain({
        rootDomain: item.domain.rootDomain,
        hostname: item.domain.hostname,
        country: item.country,
        category: item.category,
        registeredAt: item.registeredAt,
        title: item.title,
        description: item.description,
        sourceUrl: item.sourceUrl,
        notes: item.notes,
        source,
        metadata: {
          trafficImport: {
            source,
            importedAt: new Date().toISOString(),
          },
        },
      });
      await saveTrafficSummariesForDomain({
        domainId: domain.id,
        rootDomain: item.domain.rootDomain,
        country: item.country,
        results: item.snapshots,
      });
    }

    importedDomains += 1;
    importedSnapshots += item.snapshots.length;
  }

  console.log(
    `${args.dryRun ? 'Validated' : 'Imported'} ${importedSnapshots} traffic snapshots for ${importedDomains} domains, skipped ${skipped}.`
  );
}

function collectDomainImports({
  rows,
  source,
  defaultCountry,
  cacheTtlDays,
}: {
  rows: CsvRow[];
  source: TrafficDataSource;
  defaultCountry: string;
  cacheTtlDays: number;
}) {
  const imports = new Map<string, DomainImport>();

  for (const row of rows) {
    if (!row.domain) continue;

    try {
      const domain = normalizeDomain(row.domain);
      const country = normalizeCountry(row.country || defaultCountry);
      const current = imports.get(getImportKey(domain.rootDomain, country));
      const item =
        current ||
        ({
          domain,
          country,
          category: emptyToUndefined(row.category),
          registeredAt: parseOptionalDate(row.registered_at),
          title: emptyToUndefined(row.title),
          description: emptyToUndefined(row.description),
          sourceUrl: emptyToUndefined(row.source_url),
          notes: emptyToUndefined(row.notes),
          snapshots: [],
        } satisfies DomainImport);

      item.category ||= emptyToUndefined(row.category);
      item.registeredAt ||= parseOptionalDate(row.registered_at);
      item.title ||= emptyToUndefined(row.title);
      item.description ||= emptyToUndefined(row.description);
      item.sourceUrl ||= emptyToUndefined(row.source_url);
      item.notes ||= emptyToUndefined(row.notes);

      for (const point of extractTrafficPoints(row)) {
        item.snapshots.push(
          buildSnapshot({
            domain: domain.rootDomain,
            country,
            month: point.month,
            visits: point.visits,
            source,
            cacheTtlDays,
            raw: {
              importedColumn: point.column,
            },
          })
        );
      }

      imports.set(getImportKey(domain.rootDomain, country), item);
    } catch (error) {
      console.warn(
        `skip ${row.domain}: ${
          error instanceof Error ? error.message : 'invalid row'
        }`
      );
    }
  }

  for (const item of imports.values()) {
    item.snapshots = dedupeSnapshots(item.snapshots);
  }

  return imports;
}

function extractTrafficPoints(row: CsvRow) {
  const points: Array<{ month: string; visits: number; column: string }> = [];
  const explicitMonth = normalizeMonth(row.month || row.display_date);
  const explicitVisits = parseVisits(row.visits || row.traffic);

  if (explicitMonth && explicitVisits !== null) {
    points.push({
      month: explicitMonth,
      visits: explicitVisits,
      column: row.visits ? 'visits' : 'traffic',
    });
  }

  for (const [column, value] of Object.entries(row)) {
    const month = normalizeMonth(column);
    if (!month) continue;

    const visits = parseVisits(value);
    if (visits === null) continue;

    points.push({
      month,
      visits,
      column,
    });
  }

  return points;
}

function buildSnapshot({
  domain,
  country,
  month,
  visits,
  source,
  cacheTtlDays,
  raw,
}: {
  domain: string;
  country: string;
  month: string;
  visits: number;
  source: TrafficDataSource;
  cacheTtlDays: number;
  raw: Record<string, unknown>;
}): TrafficSummaryResult {
  const cachedUntil = new Date();
  cachedUntil.setUTCDate(cachedUntil.getUTCDate() + cacheTtlDays);

  return {
    domain,
    country,
    month,
    source,
    cached: false,
    cachedUntil: cachedUntil.toISOString(),
    metrics: {
      visits,
      users: null,
      desktopVisits: null,
      mobileVisits: null,
      bounceRate: null,
      pagesPerVisit: null,
      timeOnSite: null,
      accuracy: 'imported-estimate',
    },
    raw: {
      provider: source,
      importedAt: new Date().toISOString(),
      ...raw,
    },
  };
}

function dedupeSnapshots(snapshots: TrafficSummaryResult[]) {
  const byKey = new Map<string, TrafficSummaryResult>();

  for (const snapshot of snapshots) {
    byKey.set(`${snapshot.country}:${snapshot.month}`, snapshot);
  }

  return [...byKey.values()].sort((a, b) =>
    String(b.month || '').localeCompare(String(a.month || ''))
  );
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
    headers.reduce<CsvRow>((record, header, index) => {
      record[header.trim()] = values[index]?.trim() || '';
      return record;
    }, {})
  );
}

function parseArgs(args: string[]) {
  const parsed: Record<string, any> & { _: string[] } = { _: [] };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const [rawKey, inlineValue] = arg.slice(2).split('=');
      parsed[toCamelCase(rawKey)] = inlineValue ?? args[i + 1];
      if (inlineValue === undefined) i += 1;
      continue;
    }
    parsed._.push(arg);
  }

  return parsed;
}

function parseSource(value?: string): TrafficDataSource {
  if (!value) return DEFAULT_SOURCE;
  if (
    value === 'similarweb_manual' ||
    value === 'similarweb_public' ||
    value === 'query_domains'
  ) {
    return value;
  }

  throw new Error(
    'source must be similarweb_manual, similarweb_public, or query_domains.'
  );
}

function normalizeCountry(value?: string) {
  const country = String(value || '').trim();
  if (!country || country.toLowerCase() === 'global') return 'global';
  if (!/^[a-z]{2}$/i.test(country)) {
    throw new Error(`Invalid country code: ${value}`);
  }
  return country.toUpperCase();
}

function normalizeMonth(value?: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed || !MONTH_HEADER_PATTERN.test(trimmed)) return null;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  return trimmed;
}

function parseOptionalDate(value?: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed;
}

function parseVisits(value?: string) {
  const cleaned = String(value || '')
    .trim()
    .replace(/,/g, '');
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function emptyToUndefined(value?: string) {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
}

function getImportKey(rootDomain: string, country: string) {
  return `${rootDomain}:${country}`;
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
