'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createAitalkBrowserClient } from '@/features/aitalk/supabase/browser';
import { Loader2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/app';
  if (value.startsWith('/login') || value.startsWith('/auth/callback')) {
    return '/app';
  }
  return value;
}

function withClientLocale(path: string, locale: string) {
  if (!locale || locale === 'en' || path === `/${locale}`) return path;
  if (path.startsWith(`/${locale}/`)) return path;
  return `/${locale}${path}`;
}

export default function AitalkAuthCallbackClientPage() {
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const supabase = useMemo(
    () => createAitalkBrowserClient({ detectSessionInUrl: false }),
    []
  );
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishSignIn() {
      const code = searchParams.get('code');
      const next = safeRedirect(searchParams.get('next'));
      const locale = params.locale || 'en';
      if (!code) {
        window.location.replace(
          `${withClientLocale('/login', locale)}?redirect=${encodeURIComponent(next)}`
        );
        return;
      }

      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('aitalk_oauth_client_exchange_failed', {
          name: exchangeError.name,
          message: exchangeError.message,
          status: 'status' in exchangeError ? exchangeError.status : undefined,
        });
        setError(exchangeError.message);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('aitalk_oauth_client_user_failed', {
          name: userError?.name,
          message: userError?.message,
        });
        setError(userError?.message || 'Unable to read signed-in user.');
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profile')
        .select(
          'native_language,learn_language,level_language,learning_goal,learning_focus,daily_study_minutes,nick_name,learning_plan_created'
        )
        .eq('user_id', user.id)
        .limit(1);

      if (profileError) {
        console.error('aitalk_oauth_client_profile_failed', {
          message: profileError.message,
        });
      }

      const profile = data?.[0] ?? null;
      const complete = Boolean(
        profile?.native_language &&
          profile.learn_language &&
          profile.level_language &&
          profile.learning_goal &&
          profile.learning_focus &&
          profile.daily_study_minutes &&
          profile.nick_name &&
          profile.learning_plan_created
      );

      window.location.replace(
        withClientLocale(complete ? next : '/onboarding', locale)
      );
    }

    finishSignIn();
  }, [params.locale, searchParams, supabase]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f7f8f4] px-4 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Sign-in was not completed</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Please return to login and try again.
            </p>
            <Button
              type="button"
              className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                const locale = params.locale || 'en';
                window.location.replace(
                  `${withClientLocale('/login', locale)}?redirect=%2Fapp`
                );
              }}
            >
              Back to login
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold">Signing you in...</h1>
          </>
        )}
      </section>
    </main>
  );
}
