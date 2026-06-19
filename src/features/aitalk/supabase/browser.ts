'use client';

import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';

export function createAitalkBrowserClient(options?: {
  detectSessionInUrl?: boolean;
}) {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      detectSessionInUrl: options?.detectSessionInUrl,
    },
  });
}
