'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Apple, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import { createAitalkBrowserClient } from '../supabase/browser';

const profileSelect =
  'native_language,learn_language,level_language,learning_goal,learning_focus,daily_study_minutes,nick_name,learning_plan_created';

function callbackPath(locale: string, redirect: string) {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const next = redirect || '/app';
  return `${window.location.origin}${prefix}/auth/callback?next=${encodeURIComponent(
    next
  )}`;
}

function withClientLocale(path: string, locale: string) {
  if (!locale || locale === 'en' || path === `/${locale}`) return path;
  if (path.startsWith(`/${locale}/`)) return path;
  return `/${locale}${path}`;
}

type AuthMode = 'sign-in' | 'sign-up';
type LoadingAction = 'google' | 'apple' | 'email' | null;

type LoginCopy = {
  google: string;
  apple: string;
  loading: string;
  email: string;
  password: string;
  signIn: string;
  signUp: string;
  signingIn: string;
  signingUp: string;
  createAccount: string;
  backToSignIn: string;
  signUpHint: string;
  signInHint: string;
  emailDivider: string;
  passwordMinLength: string;
  checkEmail: string;
  userReadError: string;
};

export function AitalkLoginClient({
  locale,
  redirect,
  copy = {
    google: 'Continue with Google',
    apple: 'Continue with Apple',
    loading: 'Redirecting',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    signingIn: 'Signing in',
    signingUp: 'Creating account',
    createAccount: 'Create an email account',
    backToSignIn: 'Back to sign in',
    signUpHint: 'New to AITalk?',
    signInHint: 'Already have an account?',
    emailDivider: 'or use email',
    passwordMinLength: 'Use at least 6 characters.',
    checkEmail: 'Check your email to finish creating your account.',
    userReadError: 'Unable to read signed-in user.',
  },
}: {
  locale: string;
  redirect: string;
  copy?: LoginCopy;
}) {
  const supabase = useMemo(() => createAitalkBrowserClient(), []);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function redirectAfterSignIn() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error(userError?.message || copy.userReadError);
    }

    const { data, error: profileError } = await supabase
      .from('profile')
      .select(profileSelect)
      .eq('user_id', user.id)
      .limit(1);

    if (profileError) {
      console.error('aitalk_password_login_profile_failed', {
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
      withClientLocale(complete ? redirect || '/app' : '/onboarding', locale)
    );
  }

  async function login(provider: 'google' | 'apple') {
    setError('');
    setNotice('');
    setLoadingAction(provider);
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
      setLoadingAction(null);
    }
  }

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoadingAction('email');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      if (authMode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            emailRedirectTo: callbackPath(locale, redirect),
            data: {
              source: 'aitalk_web',
            },
          },
        });

        if (error) throw error;
        if (data.session) {
          await redirectAfterSignIn();
          return;
        }

        setNotice(copy.checkEmail);
        setPassword('');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) throw error;
      await redirectAfterSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoadingAction(null);
    }
  }

  const isBusy = Boolean(loadingAction);
  const isSignUp = authMode === 'sign-up';

  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={submitEmailAuth}>
        <div className="grid gap-2">
          <Label
            htmlFor="aitalk-email"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            {copy.email}
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-400" />
            <Input
              id="aitalk-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={isBusy}
              className="h-12 rounded-lg border-zinc-300 bg-white pr-3 pl-10 text-base shadow-sm shadow-zinc-900/5 dark:border-white/15 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label
            htmlFor="aitalk-password"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            {copy.password}
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-400" />
            <Input
              id="aitalk-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
              disabled={isBusy}
              className="h-12 rounded-lg border-zinc-300 bg-white pr-12 pl-10 text-base shadow-sm shadow-zinc-900/5 dark:border-white/15 dark:bg-zinc-950"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              disabled={isBusy}
              className="absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </div>
          {isSignUp ? (
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {copy.passwordMinLength}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isBusy}
          className="h-12 rounded-lg bg-emerald-600 text-base font-semibold text-white shadow-sm shadow-emerald-900/20 hover:bg-emerald-700 active:scale-[0.99]"
        >
          {loadingAction === 'email' ? (
            <Loader2 className="size-5 animate-spin" />
          ) : null}
          <span>
            {loadingAction === 'email'
              ? isSignUp
                ? copy.signingUp
                : copy.signingIn
              : isSignUp
                ? copy.signUp
                : copy.signIn}
          </span>
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-600 dark:text-zinc-300">
        <span>{isSignUp ? copy.signInHint : copy.signUpHint}</span>{' '}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setAuthMode((mode) => (mode === 'sign-in' ? 'sign-up' : 'sign-in'));
            setError('');
            setNotice('');
          }}
          className="font-semibold text-emerald-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
        >
          {isSignUp ? copy.backToSignIn : copy.createAccount}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
        <span>{copy.emailDivider}</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
      </div>

      <Button
        type="button"
        onClick={() => login('google')}
        disabled={isBusy}
        className="h-12 rounded-lg border border-zinc-300 bg-white text-base font-semibold text-zinc-950 shadow-sm shadow-zinc-900/5 hover:bg-zinc-50 active:scale-[0.99] dark:border-white/15 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
      >
        {loadingAction === 'google' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-black text-[#4285f4]"
          >
            G
          </span>
        )}
        <span>{loadingAction === 'google' ? copy.loading : copy.google}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => login('apple')}
        disabled={isBusy}
        className="h-12 rounded-lg border-zinc-950 bg-zinc-950 text-base font-semibold text-white shadow-sm shadow-zinc-900/10 hover:bg-zinc-800 active:scale-[0.99] dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {loadingAction === 'apple' ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Apple className="size-5" />
        )}
        <span>{loadingAction === 'apple' ? copy.loading : copy.apple}</span>
      </Button>
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
