import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Local restore only. Never accepts a network host, URL or production database.
const root = fs.realpathSync(process.argv[2]);
const socket = path.join(root, 'socket');
assert.ok(root.includes('/.private-backups/'));
assert.ok(fs.statSync(socket).isDirectory());
const database = 'course_restore_20261029';
const psql = '/opt/homebrew/opt/postgresql@15/bin/psql';
const schema = JSON.parse(
  fs.readFileSync(path.join(root, 'schema.json'), 'utf8')
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')
);
assert.equal(manifest.project, 'jkdhpfscpoahowolprco');
const ident = (s) => '"' + s.replaceAll('"', '""') + '"';
const literal = (s) => "'" + s.replaceAll("'", "''") + "'";
function sql(query, db = database) {
  const result = spawnSync(
    psql,
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
      input: query,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      env: { PATH: process.env.PATH, LC_ALL: 'C' },
    }
  );
  // Do not print SQL errors containing private row values.
  if (result.status !== 0)
    throw new Error(
      `Local SQL failed (${result.status}); phase aborted; no production connection used`
    );
  return result.stdout.trim();
}
// Deliberately fail if this database already exists: never destroy a prior restore.
sql(`CREATE DATABASE ${ident(database)};`, 'postgres');
sql(
  'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE postgres NOLOGIN;',
  'postgres'
);
sql(
  'CREATE SCHEMA auth; ' +
    fs.readFileSync(path.join(root, 'auth-uid.sql'), 'utf8')
);
sql('GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;');
const ddl = ['BEGIN;'];
for (const table of schema.tables) {
  const cols = schema.columns.filter((c) => c.table_name === table.relname);
  ddl.push(
    `CREATE TABLE public.${ident(table.relname)} (${cols.map((c) => `${ident(c.column_name)} ${c.type}${c.identity ? ` GENERATED ${c.identity === 'a' ? 'ALWAYS' : 'BY DEFAULT'} AS IDENTITY` : c.default_expr ? ` DEFAULT ${c.default_expr}` : ''}${c.not_null ? ' NOT NULL' : ''}`).join(',')});`
  );
}
for (const { table_name } of manifest.baseline) {
  const json = fs
    .readFileSync(path.join(root, table_name + '.json'), 'utf8')
    .trim();
  ddl.push(
    `INSERT INTO public.${ident(table_name)} OVERRIDING SYSTEM VALUE SELECT * FROM jsonb_populate_recordset(NULL::public.${ident(table_name)},${literal(json)}::jsonb);`
  );
}
for (const c of schema.constraints.sort(
  (a, b) => Number(a.contype === 'f') - Number(b.contype === 'f')
)) {
  ddl.push(
    `ALTER TABLE public.${ident(c.table_name)} ADD CONSTRAINT ${ident(c.conname)} ${c.definition};`
  );
}
for (const index of schema.indexes) {
  if (!schema.constraints.some((c) => c.conname === index.indexname))
    ddl.push(index.indexdef + ';');
}
for (const seq of schema.sequences) {
  if (seq.last_value !== null)
    ddl.push(
      `SELECT setval(${literal('public.' + seq.sequencename)},${seq.last_value},true);`
    );
}
for (const table of schema.tables) {
  if (table.relrowsecurity)
    ddl.push(
      `ALTER TABLE public.${ident(table.relname)} ENABLE ROW LEVEL SECURITY;`
    );
  if (table.relforcerowsecurity)
    ddl.push(
      `ALTER TABLE public.${ident(table.relname)} FORCE ROW LEVEL SECURITY;`
    );
  for (const acl of table.relacl ?? []) {
    const m = acl.match(/^([^=]+)=([^/]+)\/(.+)$/);
    assert.ok(m, 'Unsupported ACL');
    const mapping = {
      a: 'INSERT',
      r: 'SELECT',
      w: 'UPDATE',
      d: 'DELETE',
      D: 'TRUNCATE',
      x: 'REFERENCES',
      t: 'TRIGGER',
    };
    const privileges = [...m[2]].map((c) => {
      assert.ok(mapping[c]);
      return mapping[c];
    });
    ddl.push(
      `GRANT ${privileges.join(',')} ON public.${ident(table.relname)} TO ${ident(m[1])};`
    );
  }
}
for (const p of schema.policies)
  ddl.push(
    `CREATE POLICY ${ident(p.policyname)} ON public.${ident(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map((r) => (r === 'public' ? 'PUBLIC' : ident(r))).join(',')}${p.qual ? ` USING (${p.qual})` : ''}${p.with_check ? ` WITH CHECK (${p.with_check})` : ''};`
  );
assert.equal(
  schema.triggers.length,
  0,
  'Trigger dependencies need separate restoration'
);
ddl.push('COMMIT;');
sql(ddl.join('\n'));
const checks = [];
for (const b of manifest.baseline) {
  const result = JSON.parse(
    sql(
      `SELECT json_build_object('rows',count(*),'fingerprint',md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY id),''))) FROM public.${ident(b.table_name)} t;`
    )
  );
  assert.equal(result.rows, b.rows, b.table_name + ' count');
  assert.equal(
    result.fingerprint,
    b.fingerprint,
    b.table_name + ' fingerprint'
  );
  checks.push({ table: b.table_name, ...result });
}
const files = [
  'schema.json',
  'manifest.json',
  'auth-uid.sql',
  ...manifest.baseline.map((b) => b.table_name + '.json'),
];
const hashes = files.map((file) => {
  const bytes = fs.readFileSync(path.join(root, file));
  return {
    file,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
});
console.log(
  JSON.stringify(
    {
      database,
      serverVersion: sql('SHOW server_version;'),
      verified: true,
      checks,
      hashes,
      limits: [
        'Scoped course backup, not whole-project disaster recovery',
        'Auth UID function restored; no auth accounts or external Auth service',
        'Sequence call-state not captured; last values restored with is_called=true',
      ],
    },
    null,
    2
  )
);
