import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const remoteSecretsConfirmed =
  args.has('--remote-secrets-confirmed') ||
  process.env.CLOUDFLARE_REMOTE_SECRETS_CONFIRMED === '1';
const cloudflareAuthConfirmed =
  args.has('--cloudflare-auth-confirmed') ||
  process.env.CLOUDFLARE_AUTH_CONFIRMED === '1';

const checks = [];

function addCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function fileExists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function packageInstalled(pkg) {
  try {
    require.resolve(pkg);
    return true;
  } catch {
    return false;
  }
}

const packageJson = JSON.parse(read('package.json'));
const wranglerConfigFile = fileExists('wrangler.jsonc')
  ? 'wrangler.jsonc'
  : fileExists('wrangler.toml')
    ? 'wrangler.toml'
    : '';
const wranglerExists = Boolean(wranglerConfigFile);
const wranglerText = wranglerExists ? read(wranglerConfigFile) : '';
const lockText = fileExists('pnpm-lock.yaml') ? read('pnpm-lock.yaml') : '';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasConfigKey(key) {
  return new RegExp(`(?:"${escapeRegExp(key)}"|${escapeRegExp(key)})\\s*[:=]`).test(
    wranglerText
  );
}

function hasConfigValue(key, value) {
  return new RegExp(
    `(?:"${escapeRegExp(key)}"|${escapeRegExp(key)})\\s*[:=]\\s*"${escapeRegExp(value)}"`
  ).test(wranglerText);
}

addCheck(
  'package.json declares @opennextjs/cloudflare',
  Boolean(packageJson.dependencies?.['@opennextjs/cloudflare']),
  packageJson.dependencies?.['@opennextjs/cloudflare'] || 'missing'
);

addCheck(
  '@opennextjs/cloudflare is installed',
  packageInstalled('@opennextjs/cloudflare'),
  packageInstalled('@opennextjs/cloudflare')
    ? 'installed'
    : 'run pnpm install after npm registry is reachable'
);

addCheck(
  'pnpm-lock.yaml includes @opennextjs/cloudflare',
  lockText.includes('@opennextjs/cloudflare'),
  lockText.includes('@opennextjs/cloudflare')
    ? 'present'
    : 'lockfile not updated yet'
);

addCheck(
  'open-next.config.ts exists',
  fileExists('open-next.config.ts'),
  'required by @opennextjs/cloudflare builds'
);

addCheck(
  'Wrangler config exists',
  wranglerExists,
  wranglerExists ? wranglerConfigFile : 'create wrangler.jsonc or wrangler.toml'
);

addCheck(
  'Wrangler config has worker name',
  hasConfigValue('name', 'siterise'),
  'expected name = "siterise"'
);

addCheck(
  'Wrangler config has OpenNext output paths',
  wranglerText.includes('.open-next/worker.js') &&
    wranglerText.includes('.open-next/assets'),
  'main and assets directory should point to .open-next'
);

addCheck(
  'Wrangler config has required compatibility flags',
  /"?compatibility_flags"?\s*[:=]\s*\[[^\]]*"nodejs_compat"[^\]]*"global_fetch_strictly_public"[^\]]*\]/s.test(
    wranglerText
  ),
  'expected nodejs_compat and global_fetch_strictly_public'
);

addCheck(
  'Wrangler config has WORKER_SELF_REFERENCE service binding',
  hasConfigValue('binding', 'WORKER_SELF_REFERENCE') &&
    hasConfigValue('service', 'siterise'),
  'required by OpenNext Cloudflare worker self-fetches'
);

addCheck(
  'NEXT_PUBLIC_APP_URL is not the placeholder',
  wranglerExists &&
    !wranglerText.includes('YOUR_WORKERS_SUBDOMAIN') &&
    hasConfigKey('NEXT_PUBLIC_APP_URL'),
  wranglerText.includes('YOUR_WORKERS_SUBDOMAIN')
    ? 'replace YOUR_WORKERS_SUBDOMAIN before deploy'
    : 'configured'
);

addCheck(
  'DB singleton disabled for Workers',
  hasConfigValue('DB_SINGLETON_ENABLED', 'false'),
  'expected DB_SINGLETON_ENABLED = "false"'
);

addCheck(
  'no edge runtime declarations',
  !/export\s+const\s+runtime\s*=\s*["']edge["']/.test(
    fs
      .readdirSync(path.join(root, 'src'), { recursive: true })
      .filter((entry) => /\.(ts|tsx|js|jsx|mdx)$/.test(String(entry)))
      .map((entry) =>
        fs.readFileSync(path.join(root, 'src', String(entry)), 'utf8')
      )
      .join('\n')
  ),
  'OpenNext Cloudflare does not support Next edge runtime declarations'
);

addCheck(
  '.open-next is ignored',
  fileExists('.gitignore') && read('.gitignore').includes('.open-next'),
  'add .open-next to .gitignore'
);

addCheck(
  'AUTH_SECRET available or confirmed',
  Boolean(process.env.AUTH_SECRET || remoteSecretsConfirmed),
  process.env.AUTH_SECRET
    ? 'set in shell'
    : remoteSecretsConfirmed
      ? 'confirmed as Cloudflare secret'
      : 'set via wrangler secret put AUTH_SECRET'
);

addCheck(
  'SEMRUSH_API_KEY available or confirmed',
  Boolean(process.env.SEMRUSH_API_KEY || remoteSecretsConfirmed),
  process.env.SEMRUSH_API_KEY
    ? 'set in shell'
    : remoteSecretsConfirmed
      ? 'confirmed as Cloudflare secret'
    : 'set via wrangler secret put SEMRUSH_API_KEY'
);

addCheck(
  'Cloudflare API credentials available or confirmed',
  Boolean(
    process.env.CLOUDFLARE_API_TOKEN ||
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      cloudflareAuthConfirmed
  ),
  process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_ACCOUNT_ID
    ? 'env detected'
    : cloudflareAuthConfirmed
      ? 'wrangler auth confirmed'
    : 'run npx wrangler login or set CLOUDFLARE_API_TOKEN'
);

let failed = 0;
for (const check of checks) {
  const symbol = check.ok ? 'PASS' : 'FAIL';
  if (!check.ok) failed += 1;
  console.log(`${symbol} ${check.name}: ${check.detail}`);
}

if (failed > 0) {
  console.log(`\n${failed} check(s) failed. Cloudflare deploy is not ready.`);
  process.exitCode = 1;
} else {
  console.log('\nCloudflare deploy prerequisites look ready.');
}
