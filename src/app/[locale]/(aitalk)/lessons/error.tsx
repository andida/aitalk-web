'use client';

import { useLocale } from 'next-intl';

import { Button } from '@/shared/components/ui/button';

export default function LessonsError({ reset }: { reset: () => void }) {
  const chinese = useLocale().startsWith('zh');
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <section
        role="alert"
        className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-900"
      >
        <h1 className="text-2xl font-bold">
          {chinese ? '课程暂时无法加载' : 'Unable to load your lessons'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {chinese
            ? '请检查网络后重试。无需重新填写学习资料。'
            : 'Check your connection and try again. You do not need to repeat onboarding.'}
        </p>
        <Button
          className="mt-5 h-12 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={reset}
        >
          {chinese ? '重新加载' : 'Try again'}
        </Button>
      </section>
    </main>
  );
}
