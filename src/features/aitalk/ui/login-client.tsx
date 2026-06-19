'use client';

import { useMemo, useState } from 'react';
import { Apple, Loader2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

import { createAitalkBrowserClient } from '../supabase/browser';

function callbackPath(locale: string, redirect: string) {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const next = redirect || '/app';
  return `${window.location.origin}${prefix}/auth/callback?next=${encodeURIComponent(
    next
  )}`;
}

export function AitalkLoginClient({
  locale,
  redirect,
}: {
  locale: string;
  redirect: string;
}) {
  const supabase = useMemo(() => createAitalkBrowserClient(), []);
  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'apple' | null
  >(null);
  const [error, setError] = useState('');

  async function login(provider: 'google' | 'apple') {
    setError('');
    setLoadingProvider(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackPath(locale, redirect),
        queryParams:
          provider === 'google'
            ? {
                access_type: 'offline',
                prompt: 'consent',
              }
            : undefined,
      },
    });

    if (error) {
      setError(error.message);
      setLoadingProvider(null);
    }
  }

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        onClick={() => login('google')}
        disabled={Boolean(loadingProvider)}
        className="h-12 rounded-xl bg-emerald-500 text-base font-bold text-white hover:bg-emerald-600"
      >
        {loadingProvider === 'google' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full bg-white text-sm font-black text-emerald-600">
            G
          </span>
        )}
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => login('apple')}
        disabled={Boolean(loadingProvider)}
        className="h-12 rounded-xl border-zinc-300 bg-white text-base font-bold text-zinc-950 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        {loadingProvider === 'apple' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Apple className="size-5" />
        )}
        Continue with Apple
      </Button>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
