import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types/index.ts';

// Import only the binding type, without introducing Workers globals into the
// application-wide environment.

// D1 singleton instance (reused across requests in the same isolate)
let d1DbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get the D1 database binding from Cloudflare Workers environment.
 *
 * Uses `getCloudflareContext()` from @opennextjs/cloudflare.
 * During build/static rendering this will throw — callers should
 * handle the error gracefully (e.g. config.ts already catches it).
 */
function getD1Binding(): D1Database {
  throw new Error(
    'D1 database not supported in non-CloudflareWorkers environment.'
  );
}

export function getD1Db() {
  if (d1DbInstance) return d1DbInstance;

  const binding = getD1Binding();
  d1DbInstance = drizzle(binding);
  return d1DbInstance;
}
