'use client';

import { useLocale } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';

export default function PracticeError({ reset }: { reset: () => void }) {
  const chinese = useLocale().startsWith('zh');
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <section
        role="alert"
        className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-900"
      >
        <h1 className="text-2xl font-bold">
          {chinese ? '练习暂时无法加载' : 'Unable to load your practice'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {chinese
            ? '未能确认课程和学习进度，请重试或返回课程列表。无需重新填写学习资料。'
            : 'We could not confirm your lesson and progress. Try again or return to lessons. You do not need to repeat onboarding.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="h-12 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={reset}
          >
            {chinese ? '重新加载' : 'Try again'}
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link href="/lessons">
              {chinese ? '返回课程' : 'Back to lessons'}
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
