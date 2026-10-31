import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const gate = fileURLToPath(
  new URL('./build-cloudflare-checked.mjs', import.meta.url)
);
const lockName = '.aitalk-cloudflare-build.lock';
const builder = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const options = JSON.parse(fs.readFileSync('scenario.json', 'utf8'));
fs.appendFileSync('builder-calls.jsonl', JSON.stringify(process.argv.slice(2)) + '\n');
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
async function build() {
  if (options.hold) {
    for (let attempt = 0; !fs.existsSync('release-builder'); attempt += 1) {
      if (attempt >= 1000) throw new Error('Test builder release timed out');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  if (!options.noop) {
    for (const root of ['.next', '.open-next']) {
      if (options.link === root) {
        const target = root === '.next' ? 'external-next' : 'external-open-next';
        fs.mkdirSync(target);
        fs.symlinkSync(target, root, 'dir');
      } else {
        fs.mkdirSync(root);
      }
    }
    for (const file of ['.next/BUILD_ID', '.open-next/worker.js']) {
      if (options.omit === file) continue;
      if (options.link === file) {
        write('external-file', 'OLD EXTERNAL FILE');
        fs.symlinkSync(path.resolve('external-file'), file);
      } else {
        write(file, options.empty === file ? '' : 'NEW ' + file);
      }
    }
    if (options.omit !== 'assets') {
      if (options.link === 'assets') {
        write('external-assets/old.js', 'OLD EXTERNAL ASSET');
        fs.symlinkSync(path.resolve('external-assets'), '.open-next/assets', 'dir');
      } else {
        fs.mkdirSync('.open-next/assets/_next/static', { recursive: true });
        if (options.link === 'asset-child') {
          write('external-file', 'OLD EXTERNAL ASSET');
          fs.symlinkSync(path.resolve('external-file'), '.open-next/assets/_next/static/app.js');
        } else if (options.empty !== 'assets-directory') {
          write('.open-next/assets/_next/static/app.js', options.empty === 'asset-file' ? '' : 'NEW ASSET');
        }
      }
    }
    if (options.oldTimestamp) {
      for (const file of ['.next/BUILD_ID', '.open-next/worker.js', '.open-next/assets/_next/static/app.js']) {
        fs.utimesSync(file, 1, 1);
      }
    }
  }
  if (options.log === 'copy-stdout') fs.writeSync(1, '\u001b[31mERROR Failed to copy fixture\u001b[0m\n');
  if (options.log === 'copy-stderr') {
    fs.writeSync(2, 'Failed to ');
    fs.writeSync(2, 'copy fixture\n');
  }
  if (options.log === 'typeerror') fs.writeSync(2, 'TypeError: fixture\n');
  if (options.log === 'severity') fs.writeSync(2, '✘ [ERROR] fixture\n');
  if (options.log === 'skipped') fs.writeSync(1, 'Skipping Next.js build\n');
  if (options.log === 'benign') fs.writeSync(1, '└ /error\n0 errors\n');
  if (options.replaceLock) {
    fs.renameSync('.aitalk-cloudflare-build.lock', 'original-lock-retained');
    fs.writeFileSync('.aitalk-cloudflare-build.lock', 'KEEP REPLACEMENT LOCK');
  }
  if (options.signal) process.kill(process.pid, 'SIGTERM');
  process.exitCode = options.exitCode || 0;
}
build().catch((error) => { console.error(error); process.exitCode = 1; });
`;

function present(file) {
  return Boolean(fs.lstatSync(file, { throwIfNoEntry: false }));
}

function snapshot(root) {
  const entries = [];
  function walk(relative) {
    const file = path.join(root, relative);
    const entry = fs.lstatSync(file, { throwIfNoEntry: false });
    if (!entry) return;
    if (entry.isSymbolicLink())
      entries.push([relative, 'link', fs.readlinkSync(file)]);
    else if (entry.isFile())
      entries.push([relative, 'file', fs.readFileSync(file).toString('hex')]);
    else if (entry.isDirectory()) {
      entries.push([relative, 'directory']);
      for (const name of fs.readdirSync(file).sort())
        walk(path.join(relative, name));
    } else entries.push([relative, 'other']);
  }
  for (const name of [
    '.next',
    '.open-next',
    'external-next',
    'external-open-next',
  ])
    walk(name);
  return entries;
}

async function fixture(options, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aitalk-gate-test-'));
  try {
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(root, 'scenario.json'), JSON.stringify(options));
    fs.writeFileSync(
      path.join(bin, 'pnpm'),
      `#!${process.execPath}\n${builder}`,
      { mode: 0o700 }
    );
    // Never inherit credentials or invoke the real package manager.
    const env = { PATH: bin, TMPDIR: root, TMP: root, TEMP: root };
    let invocation = 0;
    function capture(args = [], extraEnv = {}, async = false) {
      const number = invocation++;
      const files = ['stdout', 'stderr'].map((name) =>
        path.join(root, `${number}-${name}.log`)
      );
      const fds = files.map((file) => fs.openSync(file, 'wx', 0o600));
      const settings = {
        cwd: root,
        env: { ...env, ...extraEnv },
        stdio: ['ignore', ...fds],
        shell: false,
      };
      function finish(result) {
        for (const fd of fds) fs.closeSync(fd);
        assert.equal(
          result.error,
          undefined,
          'test harness failed to execute the gate'
        );
        return {
          ...result,
          text: files.map((file) => fs.readFileSync(file, 'utf8')).join('\n'),
        };
      }
      if (!async)
        return finish(
          spawnSync(process.execPath, [gate, ...args], {
            ...settings,
            timeout: 10000,
          })
        );
      const child = spawn(process.execPath, [gate, ...args], settings);
      let error;
      child.once('error', (value) => {
        error = value;
      });
      return new Promise((resolve, reject) => {
        child.once('close', (status, signal) => {
          try {
            resolve(finish({ status, signal, error }));
          } catch (failure) {
            reject(failure);
          }
        });
      });
    }
    const calls = () => {
      const file = path.join(root, 'builder-calls.jsonl');
      return present(file)
        ? fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse)
        : [];
    };
    await callback({ root, bin, capture, calls });
  } finally {
    // Only this test's private temporary fixture is removed.
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function rejectedBeforeBuild(context, args = [], env = {}, reason) {
  const before = snapshot(context.root);
  const result = context.capture(args, env);
  assert.equal(result.status, 1, result.text);
  if (reason) assert.match(result.text, reason);
  assert.deepEqual(context.calls(), [], 'builder must not have started');
  assert.deepEqual(
    snapshot(context.root),
    before,
    'existing outputs must be unchanged'
  );
}

test('old complete artifacts + silent exit-zero builder: refuse before spawn and preserve bytes', () =>
  fixture({ noop: true }, (context) => {
    for (const file of [
      '.next/BUILD_ID',
      '.open-next/worker.js',
      '.open-next/assets/_next/static/old.js',
    ]) {
      const target = path.join(context.root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `KEEP OLD ${file}`);
    }
    rejectedBeforeBuild(context, [], {}, /Existing output path/);
  }));

for (const rootName of ['.next', '.open-next']) {
  for (const kind of [
    'empty-directory',
    'file',
    'dangling-link',
    'directory-link',
  ]) {
    test(`existing ${rootName} as ${kind}: reject without changing it`, () =>
      fixture({ noop: true }, (context) => {
        const file = path.join(context.root, rootName);
        if (kind === 'empty-directory') fs.mkdirSync(file);
        if (kind === 'file') fs.writeFileSync(file, 'KEEP');
        if (kind === 'dangling-link') fs.symlinkSync('missing-target', file);
        if (kind === 'directory-link') {
          const target =
            rootName === '.next' ? 'external-next' : 'external-open-next';
          fs.mkdirSync(path.join(context.root, target));
          fs.writeFileSync(
            path.join(context.root, target, 'keep.txt'),
            'KEEP TARGET'
          );
          fs.symlinkSync(target, file, 'dir');
        }
        rejectedBeforeBuild(context, [], {}, /Existing output path/);
      }));
  }
}

const rejectedArguments = [
  ['--skipNextBuild'],
  ['--skipNextBuild=true'],
  ['--skipNextBuild=false'],
  ['--skipNextBuild', 'true'],
  ['--skip-next-build'],
  ['--skip-next-build=true'],
  ['--skipBuild'],
  ['--skipBuild=true'],
  ['--skip-build'],
  ['-s'],
  ['-s=true'],
  ['--', '--skipNextBuild'],
  ['--'],
  ['--help'],
  ['--env', 'staging'],
  ['--openNextConfigPath', 'other.ts'],
  ['--unknown-option'],
];
for (const args of rejectedArguments) {
  test(`reject extra argv ${JSON.stringify(args)} before spawn`, () =>
    fixture({}, (context) =>
      rejectedBeforeBuild(context, args, {}, /accepts no CLI arguments/)
    ));
}
for (const key of ['SKIP_NEXT_APP_BUILD', 'SKIP_WRANGLER_CONFIG_CHECK']) {
  for (const value of ['1', 'true', 'yes', 'false', '']) {
    test(`reject presence of ${key}=${JSON.stringify(value)} before spawn`, () =>
      fixture({}, (context) =>
        rejectedBeforeBuild(
          context,
          [],
          { [key]: value },
          new RegExp(`Unset ${key}`)
        )
      ));
  }
}

for (const [name, options, reason] of [
  [
    'clean workspace + silent exit-zero noop',
    { noop: true },
    /Missing or non-directory/,
  ],
  ['missing BUILD_ID', { omit: '.next/BUILD_ID' }, /build artifact/],
  ['missing worker', { omit: '.open-next/worker.js' }, /build artifact/],
  ['missing assets', { omit: 'assets' }, /assets/],
  ['empty BUILD_ID', { empty: '.next/BUILD_ID' }, /build artifact/],
  ['empty worker', { empty: '.open-next/worker.js' }, /build artifact/],
  [
    'assets containing only empty directories',
    { empty: 'assets-directory' },
    /assets/,
  ],
  ['assets containing only an empty file', { empty: 'asset-file' }, /assets/],
  ['ANSI copy error on stdout', { log: 'copy-stdout' }, /Build log contains/],
  ['split copy error on stderr', { log: 'copy-stderr' }, /Build log contains/],
  ['TypeError on stderr', { log: 'typeerror' }, /Build log contains/],
  ['ERROR severity', { log: 'severity' }, /Build log contains/],
  ['reported skipped Next build', { log: 'skipped' }, /Build log contains/],
  ['nonzero exit despite complete artifacts', { exitCode: 7 }, /code 7/],
  ['signal despite complete artifacts', { signal: true }, /SIGTERM/],
]) {
  test(`${name}: fail`, () =>
    fixture(options, (context) => {
      const result = context.capture();
      assert.equal(result.status, 1, result.text);
      assert.match(result.text, reason);
      assert.deepEqual(context.calls(), [
        ['exec', 'opennextjs-cloudflare', 'build'],
      ]);
      assert.equal(present(path.join(context.root, lockName)), false);
    }));
}
for (const link of [
  '.next',
  '.open-next',
  '.next/BUILD_ID',
  '.open-next/worker.js',
  'assets',
  'asset-child',
]) {
  test(`new output symlink ${link}: fail`, () =>
    fixture({ link }, (context) => {
      const result = context.capture();
      assert.equal(result.status, 1, result.text);
      assert.match(result.text, /non-directory|non-regular|not a real file/);
      assert.equal(context.calls().length, 1);
    }));
}

for (const options of [{}, { oldTimestamp: true }, { log: 'benign' }]) {
  test(`new real files pass ${JSON.stringify(options)}; second invocation preserves them`, () =>
    fixture(options, (context) => {
      const result = context.capture();
      assert.equal(result.status, 0, result.text);
      assert.match(result.text, /Fresh-output and log gates passed/);
      assert.deepEqual(context.calls(), [
        ['exec', 'opennextjs-cloudflare', 'build'],
      ]);
      assert.equal(
        fs.readFileSync(path.join(context.root, '.next/BUILD_ID'), 'utf8'),
        'NEW .next/BUILD_ID'
      );
      assert.equal(
        fs.readFileSync(
          path.join(context.root, '.open-next/worker.js'),
          'utf8'
        ),
        'NEW .open-next/worker.js'
      );
      assert.equal(
        fs.readFileSync(
          path.join(context.root, '.open-next/assets/_next/static/app.js'),
          'utf8'
        ),
        'NEW ASSET'
      );
      const before = snapshot(context.root);
      const again = context.capture();
      assert.equal(again.status, 1, again.text);
      assert.equal(context.calls().length, 1);
      assert.deepEqual(snapshot(context.root), before);
    }));
}

test('pnpm unavailable: fail and release owned lock', () =>
  fixture({}, (context) => {
    const emptyBin = path.join(context.root, 'empty-bin');
    fs.mkdirSync(emptyBin);
    const result = context.capture([], { PATH: emptyBin });
    assert.equal(result.status, 1, result.text);
    assert.match(result.text, /Build process failed/);
    assert.deepEqual(context.calls(), []);
    assert.equal(present(path.join(context.root, lockName)), false);
  }));

test('pre-existing lock is preserved; builder does not start', () =>
  fixture({}, (context) => {
    const lock = path.join(context.root, lockName);
    fs.writeFileSync(lock, 'KEEP EXISTING LOCK');
    rejectedBeforeBuild(context, [], {}, /Build lock exists/);
    assert.equal(fs.readFileSync(lock, 'utf8'), 'KEEP EXISTING LOCK');
  }));

test('failed build retains new artifacts; a retry cannot reuse or overwrite them', () =>
  fixture({ log: 'copy-stderr' }, (context) => {
    const result = context.capture();
    assert.equal(result.status, 1, result.text);
    assert.match(result.text, /Build log contains/);
    assert.equal(
      fs.readFileSync(path.join(context.root, '.open-next/worker.js'), 'utf8'),
      'NEW .open-next/worker.js'
    );
    const before = snapshot(context.root);
    const again = context.capture();
    assert.equal(again.status, 1, again.text);
    assert.match(again.text, /Existing output path/);
    assert.equal(context.calls().length, 1);
    assert.deepEqual(snapshot(context.root), before);
  }));

test('lost lock ownership fails and preserves the replacement lock', () =>
  fixture({ replaceLock: true }, (context) => {
    const result = context.capture();
    assert.equal(result.status, 1, result.text);
    assert.match(result.text, /Build lock ownership was lost/);
    assert.equal(
      fs.readFileSync(path.join(context.root, lockName), 'utf8'),
      'KEEP REPLACEMENT LOCK'
    );
  }));

test('two gates cannot build concurrently in one workspace', () =>
  fixture({ hold: true }, async (context) => {
    const first = context.capture([], {}, true);
    try {
      for (
        let attempt = 0;
        context.calls().length === 0 && attempt < 500;
        attempt += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(context.calls().length, 1, 'first builder did not start');
      const second = context.capture();
      assert.equal(second.status, 1, second.text);
      assert.match(second.text, /Build lock exists/);
      assert.equal(context.calls().length, 1);
    } finally {
      fs.writeFileSync(path.join(context.root, 'release-builder'), 'release');
      const result = await first;
      assert.equal(result.status, 0, result.text);
    }
    assert.equal(present(path.join(context.root, lockName)), false);
  }));
