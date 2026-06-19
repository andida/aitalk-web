#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeDomain } from '@/features/traffic/domain';

import { closeDb } from '@/core/db';
import { upsertSeedDomain } from '@/shared/models/siterise';

type SeedRow = {
  domain: string;
  category?: string;
  country?: string;
  registered_at?: string;
  title?: string;
  description?: string;
  source_url?: string;
  notes?: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.file || args._[0];

  if (!file) {
    throw new Error(
      'Usage: pnpm siterise:import-seeds -- --file=data/siterise-seeds.csv'
    );
  }

  const rows = parseCsv(readFileSync(resolve(file), 'utf8')) as SeedRow[];
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.domain) {
      skipped += 1;
      continue;
    }

    try {
      const normalized = normalizeDomain(row.domain);
      const registeredAt = parseDate(row.registered_at);

      if (args.dryRun) {
        console.log(`[dry-run] ${normalized.rootDomain}`);
      } else {
        await upsertSeedDomain({
          rootDomain: normalized.rootDomain,
          hostname: normalized.hostname,
          category: row.category,
          country: row.country,
          registeredAt,
          title: row.title,
          description: row.description,
          sourceUrl: row.source_url,
          notes: row.notes,
        });
      }

      imported += 1;
    } catch (error) {
      skipped += 1;
      console.warn(
        `skip ${row.domain}: ${
          error instanceof Error ? error.message : 'invalid row'
        }`
      );
    }
  }

  console.log(
    `${args.dryRun ? 'Validated' : 'Imported'} ${imported} seed domains, skipped ${skipped}.`
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

function parseDate(value?: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid registered_at: ${value}`);
  }

  return date;
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
