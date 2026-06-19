import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getProfileCompleteness } from '@/features/aitalk/data';
import {
  normalizeAitalkRedirect,
  withLocale,
} from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import { AitalkLoginClient } from '@/features/aitalk/ui/login-client';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

const loginCopy = {
  zh: {
    brand: 'AITalk',
    eyebrow: '一个账号，同步 Web 和 App',
    title: '继续你的 AI 口语练习。',
    description:
      '使用和 iOS App 相同的 Google 或 Apple 账号登录，继续你的资料、计划、进度和收藏。',
    bullets: ['学习计划自动同步', '课程进度实时保存', '收藏和统计跟随同一账号'],
    cardTitle: '登录 AITalk',
    cardDescription: '选择你在 App 中使用的账号服务商。',
    google: '使用 Google 继续',
    apple: '使用 Apple 继续',
    loading: '正在跳转',
    secureTitle: 'Supabase Auth 账号体系',
    secureDescription:
      '登录完成后会回到 Web，并使用同一个 user id 读取学习数据。',
    error: '登录没有完成，请重新选择 Google 或 Apple。',
    legalPrefix: '继续即表示你同意 AITalk 的',
    privacy: '隐私政策',
    terms: '服务条款',
    legalJoiner: '和',
  },
  en: {
    brand: 'AITalk',
    eyebrow: 'One account for web and app',
    title: 'Continue your AI speaking practice.',
    description:
      'Sign in with the same Google or Apple account you use in the iOS app to keep your profile, plan, progress and collections.',
    bullets: [
      'Learning plan syncs automatically',
      'Lesson progress is saved',
      'Collections and stats follow one account',
    ],
    cardTitle: 'Sign in to AITalk',
    cardDescription: 'Choose the account provider you use in the app.',
    google: 'Continue with Google',
    apple: 'Continue with Apple',
    loading: 'Redirecting',
    secureTitle: 'Supabase Auth account system',
    secureDescription:
      'After sign in, Web uses the same user id to read your learning data.',
    error: 'Sign-in was not completed. Please try Google or Apple again.',
    legalPrefix: 'By continuing, you agree to AITalk',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    legalJoiner: 'and',
  },
};

export default async function AitalkLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string; error?: string; redirect?: string }>;
}) {
  const { locale } = await params;
  const { code, error, redirect: requestedRedirect } = await searchParams;
  const next = normalizeAitalkRedirect(requestedRedirect);

  if (code) {
    const callbackUrl = withLocale('/auth/callback', locale);
    redirect(
      `${callbackUrl}?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    );
  }

  const supabase = await createAitalkServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from('profile')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    const complete = getProfileCompleteness(data?.[0] ?? null);
    redirect(withLocale(complete ? next : '/onboarding', locale));
  }

  const copy = locale === 'zh' ? loginCopy.zh : loginCopy.en;

  return (
    <main className="min-h-[100dvh] bg-[#f7f8f4] text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-8">
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/5 lg:min-h-[calc(100dvh-3rem)] dark:border-white/10 dark:bg-zinc-900/60">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
          >
            <Image
              src="/logo.svg"
              alt={copy.brand}
              width={28}
              height={28}
              className="size-7"
              priority
            />
            <span>{copy.brand}</span>
          </Link>

          <div className="mt-7 max-w-2xl lg:mt-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              <Sparkles className="size-4" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-4 max-w-[13ch] text-4xl leading-[1.04] font-semibold tracking-tight text-zinc-950 sm:text-5xl 2xl:text-6xl dark:text-white">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              {copy.description}
            </p>
          </div>

          <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-3 lg:max-w-2xl">
            {copy.bullets.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-zinc-200 bg-[#f7f8f4] p-4 text-sm leading-6 font-medium text-zinc-700 lg:p-3 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <CheckCircle2 className="mb-4 size-5 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>

          <div className="relative mt-6 hidden min-h-[220px] overflow-hidden rounded-lg bg-[#eaf4e8] sm:block sm:min-h-[260px] lg:min-h-[150px] 2xl:min-h-[240px] dark:bg-zinc-950">
            <Image
              src="/imgs/aitalk/hero.png"
              alt="AITalk AI language tutor"
              fill
              sizes="(min-width: 1024px) 52vw, 92vw"
              className="object-contain object-bottom px-8 pt-6"
              priority
            />
          </div>
        </section>

        <section className="flex items-center justify-center lg:min-h-[calc(100dvh-3rem)]">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-900/10 md:p-8 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30">
            <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ShieldCheck className="size-6" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              {copy.cardTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {copy.cardDescription}
            </p>

            <div className="mt-7">
              <AitalkLoginClient
                locale={locale}
                redirect={next}
                copy={{
                  google: copy.google,
                  apple: copy.apple,
                  loading: copy.loading,
                }}
              />
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {copy.error}
              </p>
            ) : null}

            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <div className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {copy.secureTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
                {copy.secureDescription}
              </p>
            </div>

            <p className="mt-5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {copy.legalPrefix}{' '}
              <Link
                href="/privacy-policy"
                className="font-medium text-zinc-800 underline underline-offset-4 hover:text-emerald-700 dark:text-zinc-200 dark:hover:text-emerald-300"
              >
                {copy.privacy}
              </Link>{' '}
              {copy.legalJoiner}{' '}
              <Link
                href="/terms-of-service"
                className="font-medium text-zinc-800 underline underline-offset-4 hover:text-emerald-700 dark:text-zinc-200 dark:hover:text-emerald-300"
              >
                {copy.terms}
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
