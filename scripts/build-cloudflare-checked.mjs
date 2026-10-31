import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

// Release builds use the reviewed default output paths in an exclusive workspace.
// Reject existing outputs BEFORE OpenNext can clean or reuse them. Never remove
// or rename output directories here; a retry needs another clean workspace.
const outputRoots = ['.next', '.open-next'];
const lockPath = '.aitalk-cloudflare-build.lock';
const stat = (file) => fs.lstatSync(file, { throwIfNoEntry: false });

function requireAbsentOutputs() {
  for (const root of outputRoots) {
    if (stat(root)) {
      throw new Error(
        `Existing output path ${root}; use a new clean workspace.`
      );
    }
  }
}

function hasRealAsset(directory) {
  let found = false;
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    const entry = stat(file);
    if (entry?.isDirectory()) {
      found = hasRealAsset(file) || found;
    } else if (entry?.isFile()) {
      found = entry.size > 0 || found;
    } else {
      throw new Error(`Asset is not a real file or directory: ${file}`);
    }
  }
  return found;
}

function build() {
  // A closed interface also rejects aliases, --name=value and arguments after --.
  if (process.argv.length !== 2) {
    throw new Error('Release build accepts no CLI arguments.');
  }
  for (const key of ['SKIP_NEXT_APP_BUILD', 'SKIP_WRANGLER_CONFIG_CHECK']) {
    if (Object.hasOwn(process.env, key)) {
      throw new Error(`Unset ${key} before running a release build.`);
    }
  }
  requireAbsentOutputs();

  // Serialize this gate only. Do not run next dev or other writers here.
  let lockFd;
  try {
    lockFd = fs.openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(
        `Build lock exists: ${lockPath}; use an exclusive workspace.`
      );
    }
    throw error;
  }
  const ownedLock = fs.fstatSync(lockFd);
  const ownsLock = () => {
    const current = stat(lockPath);
    return current?.dev === ownedLock.dev && current?.ino === ownedLock.ino;
  };

  try {
    // Recheck after acquiring the lock, before loading or invoking OpenNext.
    requireAbsentOutputs();
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aitalk-build-'));
    const streams = ['stdout', 'stderr'].map((name) => {
      const file = path.join(logDir, `${name}.log`);
      return { name, file, fd: fs.openSync(file, 'wx', 0o600) };
    });
    console.log(`Cloudflare build logs: ${logDir}`);

    let result;
    try {
      result = spawnSync('pnpm', ['exec', 'opennextjs-cloudflare', 'build'], {
        stdio: ['inherit', streams[0].fd, streams[1].fd],
        shell: false,
      });
    } finally {
      for (const stream of streams) fs.closeSync(stream.fd);
    }
    for (const stream of streams) {
      process[stream.name].write(fs.readFileSync(stream.file));
    }

    const diagnostics = streams
      .map((stream) =>
        stripVTControlCharacters(fs.readFileSync(stream.file, 'utf8'))
      )
      .join('\n');
    const fatalOutput =
      /Failed to copy|Skipping Next\.js build|^\s*(?:[✘⨯×!]\s*)?(?:ERROR|FATAL)(?:\s|:|$)|\[(?:ERROR|FATAL)\]|(?:TypeError|ReferenceError|SyntaxError):|Module not found|Cannot find (?:module|package)|ERR_MODULE_NOT_FOUND|ENOENT|Failed to (?:compile|build|patch)|Build (?:failed|error occurred)|Could not resolve|Cannot perform I\/O on behalf of a different request/im;
    const problems = [];
    if (result.error)
      problems.push(`Build process failed: ${result.error.message}`);
    if (result.status !== 0 || result.signal) {
      problems.push(
        `Build exited with code ${result.status}, signal ${result.signal}`
      );
    }
    if (fatalOutput.test(diagnostics)) {
      problems.push(
        'Build log contains an error or skipped build; inspect the saved logs.'
      );
    }
    for (const root of outputRoots) {
      if (!stat(root)?.isDirectory()) {
        problems.push(`Missing or non-directory build output: ${root}`);
      }
    }
    if (problems.length > 0) throw new Error(problems.join('\n'));

    for (const file of ['.next/BUILD_ID', '.open-next/worker.js']) {
      const entry = stat(file);
      if (!entry?.isFile() || entry.size === 0) {
        problems.push(`Missing, empty or non-regular build artifact: ${file}`);
      }
    }
    const assets = '.open-next/assets';
    if (!stat(assets)?.isDirectory() || !hasRealAsset(assets)) {
      problems.push(`Missing, empty or non-directory assets: ${assets}`);
    }
    if (!ownsLock()) problems.push('Build lock ownership was lost.');
    if (problems.length > 0) throw new Error(problems.join('\n'));

    console.log(
      'Fresh-output and log gates passed; application release checks are still required.'
    );
  } finally {
    // Release this invocation's lock only while its filesystem identity matches.
    try {
      if (ownsLock()) fs.unlinkSync(lockPath);
    } finally {
      fs.closeSync(lockFd);
    }
  }
}

try {
  build();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
