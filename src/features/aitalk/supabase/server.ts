import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';

export async function createAitalkServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes
          // sessions before render, so this is acceptable for read-only pages.
        }
      },
    },
  });
}

export async function getAitalkUser() {
  const supabase = await createAitalkServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
