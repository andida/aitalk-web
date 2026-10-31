import { envConfigs } from '@/config';

import { getD1Db } from './d1';
import { closeMysqlDb, getMysqlDb } from './mysql';
import { closePostgresDb, getPostgresDb } from './postgres';

const mysqlCompatProxyCache = new WeakMap<object, object>();
const sqliteCompatProxyCache = new WeakMap<object, object>();

// This guard checks only whether a member is a function. The never[] signature
// does not describe argument or query-result contracts. Calls below
// remain dynamic dispatch; their results are contained as unknown.
function hasMethod<K extends PropertyKey>(
  target: object,
  key: K
): target is object & Record<K, (...args: never[]) => unknown> {
  const value: unknown = Reflect.get(target, key);
  return typeof value === 'function';
}

/**
 * Global fallback for Drizzle `.returning()` on dialects that don't support it (notably MySQL).
 *
 * Many call sites do: `db().insert(...).values(...).returning()`.
 * In MySQL, `.returning()` does not exist, so we polyfill it by:
 * - capturing the `.values()` / `.set()` payload
 * - executing the query
 * - returning `[payload]`
 *
 * This keeps code changes minimal while remaining compatible with Postgres/SQLite
 * (where the native `.returning()` is used).
 */
function withMysqlCompat(dbInstance: object): object {
  if (dbInstance && typeof dbInstance === 'object') {
    const cached = mysqlCompatProxyCache.get(dbInstance);
    if (cached) return cached;
  }

  const wrapQuery = (query: unknown, ctx: { payload?: unknown }): unknown => {
    if (!query || typeof query !== 'object') return query;

    return new Proxy(query, {
      get(target, prop, receiver: unknown): unknown {
        // MySQL doesn't support `onConflictDoUpdate`; Drizzle uses `onDuplicateKeyUpdate`.
        // Polyfill it so call sites can stay dialect-agnostic.
        if (
          prop === 'onConflictDoUpdate' &&
          !hasMethod(target, 'onConflictDoUpdate') &&
          hasMethod(target, 'onDuplicateKeyUpdate')
        ) {
          return (cfg: { set?: unknown } | null | undefined) => {
            // Re-read the member at call time, as the original method call did.
            const res: unknown = Reflect.apply(
              target.onDuplicateKeyUpdate,
              target,
              [{ set: cfg?.set }]
            );
            return wrapQuery(res, ctx);
          };
        }

        // If this dialect doesn't implement `.returning()`, provide a fallback.
        if (prop === 'returning' && !hasMethod(target, 'returning')) {
          return async (..._args: unknown[]): Promise<unknown[]> => {
            // Ensure the query actually runs.
            await target;
            if (ctx.payload === undefined) return [];
            return Array.isArray(ctx.payload) ? ctx.payload : [ctx.payload];
          };
        }

        const value: unknown = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;

        return (...args: unknown[]): unknown => {
          // Capture best-effort payload for return value fallback.
          if (prop === 'values' || prop === 'set') {
            ctx.payload = args[0];
          }

          const res: unknown = value.apply(target, args);
          // Keep wrapping to preserve chaining.
          return wrapQuery(res, ctx);
        };
      },
    });
  };

  const proxied = new Proxy(dbInstance, {
    get(target, prop, receiver: unknown): unknown {
      // Wrap transaction callback so `tx` is also polyfilled (returning + onConflictDoUpdate).
      if (prop === 'transaction') {
        const original: unknown = Reflect.get(target, prop, receiver);
        if (typeof original !== 'function') return original;

        return (fn: (tx: object) => unknown, ...rest: unknown[]): unknown => {
          return original.call(
            target,
            (tx: object) => fn(withMysqlCompat(tx)),
            ...rest
          );
        };
      }

      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;

      // Only wrap mutation builders; everything else is passed through.
      if (prop !== 'insert' && prop !== 'update' && prop !== 'delete') {
        return value.bind(target);
      }

      return (...args: unknown[]): unknown => {
        const res: unknown = value.apply(target, args);
        return wrapQuery(res, {});
      };
    },
  });

  if (dbInstance && typeof dbInstance === 'object') {
    mysqlCompatProxyCache.set(dbInstance, proxied);
  }

  return proxied;
}

/**
 * SQLite/Turso compatibility shim:
 * - SQLite doesn't support row-level locking; Drizzle's select builder may not implement `.for()`.
 *   We polyfill `.for(...)` as a no-op to keep call sites portable.
 */
function withSqliteCompat(dbInstance: object, provider?: string): object {
  if (dbInstance && typeof dbInstance === 'object') {
    const cached = sqliteCompatProxyCache.get(dbInstance);
    if (cached) return cached;
  }

  const wrapQuery = (query: unknown): unknown => {
    if (!query || typeof query !== 'object') return query;

    return new Proxy(query, {
      get(target, prop, receiver: unknown): unknown {
        // `.for('update')` is not meaningful in SQLite; treat it as no-op when missing.
        if (prop === 'for' && !hasMethod(target, 'for')) {
          return (..._args: unknown[]) => receiver;
        }

        const value: unknown = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;

        return (...args: unknown[]): unknown => {
          const res: unknown = value.apply(target, args);
          return wrapQuery(res);
        };
      },
    });
  };

  const proxied = new Proxy(dbInstance, {
    get(target, prop, receiver: unknown): unknown {
      // Wrap transaction callback so `tx` is also shimmed.
      if (prop === 'transaction') {
        // D1 doesn't support interactive transactions (BEGIN/COMMIT as
        // separate calls). Drizzle provides a .transaction() method but it
        // fails at runtime. Fall back to running the callback directly with
        // `db` as the "tx" — individual statements are still atomic.
        if (provider === 'd1') {
          return (fn: (tx: object) => unknown): unknown => fn(proxied);
        }
        const original: unknown = Reflect.get(target, prop, receiver);
        if (typeof original !== 'function') return original;
        return (fn: (tx: object) => unknown, ...rest: unknown[]): unknown =>
          original.call(
            target,
            (tx: object) => fn(withSqliteCompat(tx, provider)),
            ...rest
          );
      }

      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;

      // Wrap select builders so `.for()` can be polyfilled on the built query.
      if (typeof prop === 'string' && prop.startsWith('select')) {
        return (...args: unknown[]): unknown =>
          wrapQuery(value.apply(target, args));
      }

      return value.bind(target);
    },
  });

  if (dbInstance && typeof dbInstance === 'object') {
    sqliteCompatProxyCache.set(dbInstance, proxied);
  }

  return proxied;
}

/**
 * Universal DB accessor.
 *
 * Drizzle returns different DB types for Postgres vs SQLite/libsql.
 * If we return a union here, TypeScript can't call methods like `db().insert(...)`
 * because the overloads are incompatible across dialects. The schema tables are
 * themselves a Postgres/SQLite union, so a PostgreSQL-only return type rejects
 * those tables. MySQL `.returning()` echoes input, and the D1 callback shim has
 * no rollback. `dbPostgres()` is the typed PostgreSQL entry. This accessor stays
 * untyped until each caller is paired with one dialect.
 */
// The schema is a Postgres/SQLite union, so this accessor cannot name one dialect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(): any {
  if (envConfigs.database_provider === 'd1') {
    return withSqliteCompat(getD1Db(), 'd1');
  }

  if (['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    throw new Error(
      'SQLite/libsql is not available in the Cloudflare Worker build. Use DATABASE_PROVIDER=postgresql or d1.'
    );
  }

  if (envConfigs.database_provider === 'mysql') {
    return withMysqlCompat(getMysqlDb());
  }

  return getPostgresDb();
}

export type DatabaseSession = ReturnType<typeof db>;

export function dbPostgres(): ReturnType<typeof getPostgresDb> {
  if (envConfigs.database_provider !== 'postgresql') {
    throw new Error('Database provider is not PostgreSQL');
  }

  return getPostgresDb();
}

export function dbMysql(): ReturnType<typeof getMysqlDb> {
  if (envConfigs.database_provider !== 'mysql') {
    throw new Error('Database provider is not MySQL');
  }

  return getMysqlDb();
}

export function dbSqlite(): never {
  if (!['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    throw new Error('Database provider is not SQLite');
  }

  throw new Error(
    'SQLite/libsql is not available in the Cloudflare Worker build. Use DATABASE_PROVIDER=postgresql or d1.'
  );
}

export function dbD1(): ReturnType<typeof getD1Db> {
  if (envConfigs.database_provider !== 'd1') {
    throw new Error('Database provider is not D1');
  }

  return getD1Db();
}

export async function closeDb() {
  if (envConfigs.database_provider === 'postgresql') {
    await closePostgresDb();
    return;
  }

  if (envConfigs.database_provider === 'mysql') {
    await closeMysqlDb();
    return;
  }
}
