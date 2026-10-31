import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = fs.realpathSync(process.argv[2]);
assert.ok(root.includes('/.private-backups/'));
const socket = path.join(root, 'socket');
const database = 'course_import_test_20261029';
function sql(q, db = database) {
  const r = spawnSync(
    '/opt/homebrew/opt/postgresql@15/bin/psql',
    [
      '-X',
      '-h',
      socket,
      '-p',
      '55439',
      '-d',
      db,
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
    ],
    {
      input: q,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      env: { PATH: process.env.PATH },
    }
  );
  if (r.status !== 0)
    throw Error('Isolated import SQL failed; no production connection used');
  return r.stdout.trim();
}
sql(
  `CREATE DATABASE ${database} TEMPLATE course_restore_20261029;`,
  'postgres'
);
const tables = [
  'lesson_list_detail',
  'course_lesson_steps',
  'course_lesson_i18n',
  'course_lesson_step_i18n',
  'user_learning_plans',
  'user_learning_plan_items',
  'user_lesson_progress',
  'lesson_attempts',
];
function fingerprints() {
  return Object.fromEntries(
    tables.map((t) => [
      t,
      sql(
        `SELECT md5(string_agg((to_jsonb(t)-'created_at'-'updated_at')::text,E'\\n' ORDER BY id)) FROM public.${t} t;`
      ),
    ])
  );
}
const before = fingerprints();
const migration = fs.readFileSync(
  path.resolve(
    'aitalk_ef/supabase/migrations/202607020001_promote_l2_l5_course_content_v2.sql'
  ),
  'utf8'
);
sql(migration);
const after = fingerprints();
sql(migration);
const repeated = fingerprints();
assert.deepEqual(after, repeated, 'Import must be semantically idempotent');
const changed = tables.filter((t) => before[t] !== after[t]);
const validation = JSON.parse(
  sql(
    `SELECT json_build_object('lessons',count(*),'bad_step_sets',count(*) FILTER (WHERE n<>5 OR types<>5)) FROM (SELECT l.id,count(s.id) AS n,count(DISTINCT s.step_type) AS types FROM public.lesson_list_detail l LEFT JOIN public.course_lesson_steps s ON s.lesson_id=l.id WHERE l.language='English' AND l.level_id BETWEEN 2 AND 5 AND l.content_version='v2_full' GROUP BY l.id) x;`
  )
);
assert.equal(validation.lessons, 80);
assert.equal(validation.bad_step_sets, 0);
assert.ok(
  !changed.some((t) => t.startsWith('user_') || t === 'lesson_attempts')
);
console.log(
  JSON.stringify(
    {
      database,
      changedTables: changed,
      semanticIdempotency: true,
      validation,
      productionChanged: false,
    },
    null,
    2
  )
);
