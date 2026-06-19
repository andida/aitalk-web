#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { normalizeDomain } from '@/features/traffic/domain';

import { closeDb } from '@/core/db';
import { upsertSeedDomain } from '@/shared/models/siterise';

type ImportMode = 'rank_difference' | 'rank';

type SemrushSeed = {
  domain: string;
  rank?: number | null;
  organicTraffic?: number | null;
  organicTrafficDifference?: number | null;
  organicKeywords?: number | null;
  sourceRow: Record<string, string>;
};

type SeedCsvRow = {
  domain: string;
  category: string;
  country: string;
  registered_at: string;
  title: string;
  description: string;
  source_url: string;
  notes: string;
};

const SEMRUSH_API_URL = 'https://api.semrush.com/';
const DEFAULT_LIMIT = 100;
const DEFAULT_DATABASE = 'us';
const DEFAULT_CATEGORY = 'General';
const RANK_DIFFERENCE_COLUMNS = [
  'Dn',
  'Rk',
  'Or',
  'Ot',
  'Om',
  'Tm',
  'Um',
  'Oc',
].join(',');
const RANK_COLUMNS = ['Dn', 'Rk', 'Or', 'Ot', 'Oc', 'Ad', 'At', 'Ac'].join(',');
const BLOCKED_DOMAIN_PATTERNS = [
  /porn/i,
  /xnxx/i,
  /xvideos/i,
  /redtube/i,
  /youporn/i,
  /onlyfans/i,
  /chaturbate/i,
  /xhamster/i,
  /fapello/i,
  /sex/i,
  /xxx/i,
  /hentai/i,
  /erotic/i,
  /camgirl/i,
  /adult/i,
  /casino/i,
  /betting/i,
  /gambling/i,
];
const BLOCKED_ROOT_DOMAINS = new Set(['co.cz']);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = String(args.key || process.env.SEMRUSH_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error(
      'SEMRUSH_API_KEY is required. Set it in your env file or pass --key.'
    );
  }

  const mode = parseMode(args.type || args.mode);
  const database = String(args.database || DEFAULT_DATABASE).toLowerCase();
  const limit = parsePositiveInt(args.limit, DEFAULT_LIMIT);
  const category = String(args.category || DEFAULT_CATEGORY);
  const country = String(args.country || 'global');
  const minTraffic = parseNonNegativeInt(args.minTraffic, 0);
  const minTrafficDelta = parseNonNegativeInt(args.minTrafficDelta, 0);
  const onlyPositive = args.positive !== false && mode === 'rank_difference';
  const allowSensitive = args.allowSensitive === true;
  const outputFile = args.output ? String(args.output) : '';
  const sort = String(
    args.sort || (mode === 'rank_difference' ? 'tm_desc' : 'rk_asc')
  );
  const batchId = createBatchId();

  console.log(
    `Fetching Semrush ${mode} seeds: database=${database}, limit=${limit}, sort=${sort}.`
  );

  const seeds = await fetchSemrushSeeds({
    apiKey,
    mode,
    database,
    limit,
    sort,
  });

  let imported = 0;
  let skipped = 0;
  const csvRows: SeedCsvRow[] = [];

  for (const seed of seeds) {
    try {
      if (!seed.domain) {
        skipped += 1;
        continue;
      }
      if (
        seed.organicTraffic !== null &&
        seed.organicTraffic !== undefined &&
        seed.organicTraffic < minTraffic
      ) {
        skipped += 1;
        continue;
      }
      if (
        onlyPositive &&
        (seed.organicTrafficDifference === null ||
          seed.organicTrafficDifference === undefined ||
          seed.organicTrafficDifference <= minTrafficDelta)
      ) {
        skipped += 1;
        continue;
      }

      const normalized = normalizeDomain(seed.domain);
      if (!allowSensitive && shouldSkipDomain(normalized.rootDomain)) {
        skipped += 1;
        console.log(`skip ${normalized.rootDomain}: filtered by seed policy`);
        continue;
      }

      const notes = buildNotes({
        mode,
        database,
        batchId,
        rank: seed.rank,
        organicTraffic: seed.organicTraffic,
        organicTrafficDifference: seed.organicTrafficDifference,
        organicKeywords: seed.organicKeywords,
      });

      if (outputFile) {
        csvRows.push({
          domain: normalized.rootDomain,
          category,
          country,
          registered_at: '',
          title: '',
          description: '',
          source_url: buildSourceUrl(mode, database),
          notes,
        });
      } else if (args.dryRun) {
        console.log(`[dry-run] ${normalized.rootDomain} ${notes}`);
      } else {
        await upsertSeedDomain({
          rootDomain: normalized.rootDomain,
          hostname: normalized.hostname,
          category,
          country,
          sourceUrl: buildSourceUrl(mode, database),
          notes,
        });
      }

      imported += 1;
    } catch (error) {
      skipped += 1;
      console.warn(
        `skip ${seed.domain}: ${
          error instanceof Error ? error.message : 'invalid row'
        }`
      );
    }
  }

  if (outputFile) {
    writeSeedCsv(outputFile, csvRows);
  }

  console.log(
    `${outputFile ? 'Exported' : args.dryRun ? 'Validated' : 'Imported'} ${imported} Semrush seed domains, skipped ${skipped}.`
  );
}

async function fetchSemrushSeeds({
  apiKey,
  mode,
  database,
  limit,
  sort,
}: {
  apiKey: string;
  mode: ImportMode;
  database: string;
  limit: number;
  sort: string;
}) {
  const url = new URL(SEMRUSH_API_URL);
  url.searchParams.set('type', mode);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('database', database);
  url.searchParams.set('display_limit', String(limit));
  url.searchParams.set('display_sort', sort);
  url.searchParams.set(
    'export_columns',
    mode === 'rank_difference' ? RANK_DIFFERENCE_COLUMNS : RANK_COLUMNS
  );

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Semrush request failed with HTTP ${response.status}.`);
  }
  if (/^ERROR/i.test(text.trim())) {
    throw new Error(text.trim());
  }

  return parseSemrushCsv(text).map(mapSemrushRow).filter(isSemrushSeed);
}

function parseSemrushCsv(input: string) {
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
    if (!quoted && char === ';') {
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

function mapSemrushRow(row: Record<string, string>): SemrushSeed | null {
  const domain = row.Domain || row.domain;
  if (!domain) return null;

  return {
    domain,
    rank: parseNumber(row.Rank),
    organicTraffic: parseNumber(row['Organic Traffic']),
    organicTrafficDifference: parseNumber(row['Organic Traffic Difference']),
    organicKeywords: parseNumber(row['Organic Keywords']),
    sourceRow: row,
  };
}

function isSemrushSeed(seed: SemrushSeed | null): seed is SemrushSeed {
  return seed !== null;
}

function buildNotes({
  mode,
  database,
  batchId,
  rank,
  organicTraffic,
  organicTrafficDifference,
  organicKeywords,
}: {
  mode: ImportMode;
  database: string;
  batchId: string;
  rank?: number | null;
  organicTraffic?: number | null;
  organicTrafficDifference?: number | null;
  organicKeywords?: number | null;
}) {
  return [
    `source=semrush`,
    `report=${mode}`,
    `database=${database}`,
    `batch=${batchId}`,
    rank === null || rank === undefined ? null : `rank=${rank}`,
    organicTraffic === null || organicTraffic === undefined
      ? null
      : `organicTraffic=${organicTraffic}`,
    organicTrafficDifference === null || organicTrafficDifference === undefined
      ? null
      : `organicTrafficDelta=${organicTrafficDifference}`,
    organicKeywords === null || organicKeywords === undefined
      ? null
      : `organicKeywords=${organicKeywords}`,
  ]
    .filter(Boolean)
    .join('; ');
}

function buildSourceUrl(mode: ImportMode, database: string) {
  const url = new URL(SEMRUSH_API_URL);
  url.searchParams.set('type', mode);
  url.searchParams.set('database', database);
  return url.toString();
}

function writeSeedCsv(file: string, rows: SeedCsvRow[]) {
  const outputPath = resolve(file);
  mkdirSync(dirname(outputPath), { recursive: true });

  const headers: Array<keyof SeedCsvRow> = [
    'domain',
    'category',
    'country',
    'registered_at',
    'title',
    'description',
    'source_url',
    'notes',
  ];
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(',')
    ),
  ].join('\n');

  writeFileSync(outputPath, `${csv}\n`, 'utf8');
  console.log(`Wrote ${rows.length} rows to ${outputPath}.`);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
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
    if (arg === '--no-positive') {
      parsed.positive = false;
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

function parseMode(value: unknown): ImportMode {
  const mode = String(value || 'rank_difference');
  if (mode === 'rank_difference' || mode === 'rank') return mode;
  throw new Error('--type must be rank_difference or rank.');
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseNonNegativeInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldSkipDomain(rootDomain: string) {
  if (BLOCKED_ROOT_DOMAINS.has(rootDomain)) return true;
  return BLOCKED_DOMAIN_PATTERNS.some((pattern) => pattern.test(rootDomain));
}

function createBatchId() {
  return new Date().toISOString().slice(0, 10);
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
