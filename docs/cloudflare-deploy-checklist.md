# Cloudflare Deploy Checklist

Last updated: 2026-06-12

## Current Status

`npm run build` passes locally with Next.js 16.2.9.

The repository includes a committed `wrangler.jsonc` for Cloudflare Workers + OpenNext. Do not rely on a local `wrangler.toml` for CI or Cloudflare builds because `wrangler.toml` is intentionally ignored.

The project includes a deployment readiness check and deploy commands:

```bash
pnpm cf:check
pnpm build
pnpm cf:preview
pnpm cf:deploy
```

Alpha uses `open-next.config.ts` with OpenNext's dummy cache. Enable R2 incremental cache later when production watchlists, ISR, or higher traffic make persistent page cache worthwhile.

## Required Before Deploy

1. Install dependencies:

```bash
pnpm install
```

This installs `@opennextjs/cloudflare` and `wrangler` from the lockfile.

2. Confirm public production vars in `wrangler.jsonc`:

```text
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=SiteRise
NEXT_PUBLIC_APP_DESCRIPTION=Website opportunity intelligence for finding fast-growing domains and competitor movement.
NEXT_PUBLIC_THEME=default
NEXT_PUBLIC_APPEARANCE=system
AUTH_SECRET=<generated-secret>
SEMRUSH_API_KEY=<semrush-api-key>
SEMRUSH_TRENDS_BASE_URL=https://api.semrush.com/analytics/ta/api/v3
SEMRUSH_CACHE_TTL_DAYS=30
SEMRUSH_MAX_RPS=10
DB_SINGLETON_ENABLED=false
```

Use Cloudflare dashboard secrets or Wrangler secrets for sensitive values such as `AUTH_SECRET` and `SEMRUSH_API_KEY`. Do not commit those values to `wrangler.jsonc`.

```bash
openssl rand -base64 32
npx wrangler secret put AUTH_SECRET
npx wrangler secret put SEMRUSH_API_KEY
```

3. Log in to Cloudflare:

```bash
npx wrangler login
```

Alternatively, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your shell or CI environment.

4. Configure Supabase Postgres and Better Auth:

SiteRise uses Supabase as the primary Postgres database. User accounts and sessions are still managed by the template's Better Auth tables (`user`, `session`, `account`, `verification`). Do not enable Supabase Auth for the web app unless the auth architecture is intentionally changed later.

Set these values for local development and Cloudflare:

```text
DATABASE_PROVIDER=postgresql
DATABASE_URL=<supabase-postgres-connection-string>
DB_SCHEMA_FILE=./src/config/db/schema.ts
DB_SCHEMA=public
DB_MIGRATIONS_SCHEMA=drizzle
DB_SINGLETON_ENABLED=false
DB_MAX_CONNECTIONS=1
AUTH_SECRET=<generated-secret>
```

Use Cloudflare dashboard secrets or Wrangler secrets for sensitive values. Do not commit `DATABASE_URL` or `AUTH_SECRET`.

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put AUTH_SECRET
```

Generate and apply database migrations after `DATABASE_URL` is configured:

```bash
pnpm db:generate
pnpm db:migrate
```

The repository currently ignores generated migration files under `src/config/db/migrations*`, so migration SQL is generated locally or in CI rather than committed. If you want reviewed, committed migrations later, remove that ignore rule first.

The active schema export is `src/config/db/schema.ts`, which points to `schema.postgres.ts`. SiteRise-specific tables use the `siterise_` prefix and coexist with Better Auth, payment, credit, and admin tables from the template.

5. Run Cloudflare preview:

```bash
pnpm cf:preview
```

6. Deploy:

```bash
pnpm cf:deploy
```

Cloudflare's current build pipeline uses `npm run build` followed by `npx wrangler deploy`. The `build` script runs `opennextjs-cloudflare build`, and `open-next.config.ts` sets `buildCommand = "npm run build:next"` so OpenNext can run the real Next.js build without recursively calling itself.

## Notes

- Keep `DB_SINGLETON_ENABLED=false` on Cloudflare Workers.
- Do not expose `SEMRUSH_API_KEY` through `NEXT_PUBLIC_*`.
- Current Semrush traffic cache is in memory in the lightweight alpha Worker. Production watchlists, usage analytics, and leaderboards should persist to Supabase tables.
- Paid leaderboards and CSV export should stay disabled until Semrush redistribution/export rights are confirmed.
- `--remote-ready` tells the local readiness script that Cloudflare auth and remote secrets have already been configured outside the local shell.
