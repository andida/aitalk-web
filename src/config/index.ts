import packageJson from '../../package.json';

// Note: Environment variables are loaded via dotenv-cli in package.json scripts.
// Next.js automatically loads .env files in the runtime, so no manual loading is needed here.

export type ConfigMap = Record<string, string>;

export const envConfigs: ConfigMap = {
  app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  app_name: process.env.NEXT_PUBLIC_APP_NAME ?? 'AITalk',
  app_description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
    'AI speaking practice for language learners.',
  app_logo: process.env.NEXT_PUBLIC_APP_LOGO ?? '/logo.svg',
  app_favicon: process.env.NEXT_PUBLIC_APP_FAVICON ?? '/favicon.svg',
  app_preview_image:
    process.env.NEXT_PUBLIC_APP_PREVIEW_IMAGE ?? '/preview.png',
  theme: process.env.NEXT_PUBLIC_THEME ?? 'default',
  appearance: process.env.NEXT_PUBLIC_APPEARANCE ?? 'system',
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en',
  google_analytics_id:
    process.env.GOOGLE_ANALYTICS_ID ??
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ??
    'G-D385CGXQY8',
  database_url: process.env.DATABASE_URL ?? '',
  database_auth_token: process.env.DATABASE_AUTH_TOKEN ?? '',
  database_provider: process.env.DATABASE_PROVIDER ?? 'postgresql',
  db_schema_file: process.env.DB_SCHEMA_FILE ?? './src/config/db/schema.ts',
  // PostgreSQL schema name for this project inside the shared Supabase database.
  db_schema: process.env.DB_SCHEMA ?? 'aitalk',
  // Drizzle migrations journal table name (avoid conflicts across projects)
  db_migrations_table:
    process.env.DB_MIGRATIONS_TABLE ?? '__drizzle_migrations_aitalk',
  // Drizzle migrations journal schema (default in drizzle-kit is 'drizzle')
  db_migrations_schema: process.env.DB_MIGRATIONS_SCHEMA ?? 'drizzle',
  // Output folder for drizzle-kit generated migrations
  db_migrations_out:
    process.env.DB_MIGRATIONS_OUT ?? './src/config/db/migrations_postgres',
  db_singleton_enabled: process.env.DB_SINGLETON_ENABLED || 'false',
  db_max_connections: process.env.DB_MAX_CONNECTIONS || '1',
  auth_url: process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '',
  auth_secret: process.env.AUTH_SECRET ?? '', // openssl rand -base64 32
  supabase_url:
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    'https://jkdhpfscpoahowolprco.supabase.co',
  supabase_anon_key:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZGhwZnNjcG9haG93b2xwcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODgzNDE3NTQsImV4cCI6MjAwMzkxNzc1NH0.cMmgh_NJX4A5TT7i33FHufTn1UKao8tIM9HaREDnK-o',
  version: packageJson.version,
  locale_detect_enabled:
    process.env.NEXT_PUBLIC_LOCALE_DETECT_ENABLED ?? 'false',
};
