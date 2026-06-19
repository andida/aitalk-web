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
  copy = {
    google: 'Continue with Google',
    apple: 'Continue with Apple',
    loading: 'Redirecting',
  },
}: {
  locale: string;
  redirect: string;
  copy?: {
    google: string;
    apple: string;
    loading: string;
  };
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
        className="h-12 rounded-lg border border-zinc-300 bg-white text-base font-semibold text-zinc-950 shadow-sm shadow-zinc-900/5 hover:bg-zinc-50 active:scale-[0.99] dark:border-white/15 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
      >
        {loadingProvider === 'google' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-black text-[#4285f4]"
          >
            G
          </span>
        )}
        <span>{loadingProvider === 'google' ? copy.loading : copy.google}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => login('apple')}
        disabled={Boolean(loadingProvider)}
        className="h-12 rounded-lg border-zinc-950 bg-zinc-950 text-base font-semibold text-white shadow-sm shadow-zinc-900/10 hover:bg-zinc-800 active:scale-[0.99] dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {loadingProvider === 'apple' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Apple className="size-5" />
        )}
        <span>{loadingProvider === 'apple' ? copy.loading : copy.apple}</span>
      </Button>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
