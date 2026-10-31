'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { cacheGet, cacheSet } from '@/shared/lib/cache';

const CACHE_CHANGE_EVENT = 'aitalk:banner-cache-change';
const getServerSnapshot = () => null;

// Cache/browser reads happen in the subscription and real browser events, never
// during render. The cached primitive snapshot also stays stable for React.
function createBrowserStore<T>(read: () => T, isEqual: (a: T, b: T) => boolean) {
  let snapshot: T | null = null;
  const listeners = new Set<() => void>();
  const refresh = () => {
    const next = read();
    if (snapshot !== null && isEqual(snapshot, next)) return;
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener('storage', refresh);
        window.addEventListener('languagechange', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener(CACHE_CHANGE_EVENT, refresh);
        refresh();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener('storage', refresh);
          window.removeEventListener('languagechange', refresh);
          window.removeEventListener('focus', refresh);
          window.removeEventListener(CACHE_CHANGE_EVENT, refresh);
        }
      };
    },
  };
}

export function useBannerBrowserSnapshot<T>(read: () => T, isEqual: (a: T, b: T) => boolean = Object.is) {
  const store = useMemo(() => createBrowserStore(read, isEqual), [read, isEqual]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}

export function readBannerCache(key: string): string | null {
  try {
    return cacheGet(key);
  } catch {
    // Storage can be unavailable. A local dismissal still works for this mount.
    return null;
  }
}

export function writeBannerCache(key: string, value: string, expiresAt?: number) {
  try {
    cacheSet(key, value, expiresAt);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CACHE_CHANGE_EVENT));
}
