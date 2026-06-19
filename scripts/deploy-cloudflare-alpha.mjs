import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const mode = args.has('--deploy')
  ? 'deploy'
  : args.has('--build-only')
    ? 'build-only'
    : 'preview';
const remoteReady = args.has('--remote-ready');

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const readinessArgs = ['scripts/check-cloudflare-readiness.mjs'];
if (remoteReady) {
  readinessArgs.push('--remote-secrets-confirmed', '--cloudflare-auth-confirmed');
}

run('node', readinessArgs);
run('npm', ['run', 'build']);
run('pnpm', ['exec', 'opennextjs-cloudflare', 'build']);

if (mode === 'preview') {
  run('pnpm', ['exec', 'opennextjs-cloudflare', 'preview']);
}

if (mode === 'deploy') {
  run('pnpm', ['exec', 'opennextjs-cloudflare', 'deploy']);
}
