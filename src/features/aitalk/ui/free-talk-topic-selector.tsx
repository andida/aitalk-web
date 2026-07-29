import { ArrowRight, Clock3, MessageCircle, ShieldCheck } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';

import { FREE_TALK_TOPICS } from '../lib/free-talk-topics';

export function FreeTalkTopicSelector({
  invalidTopicKey = false,
}: {
  invalidTopicKey?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="max-w-3xl">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <MessageCircle className="size-4" />
          Free conversation
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-balance md:text-4xl">
          What would you like to talk about?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base dark:text-zinc-300">
          Choose a topic and your tutor will match the questions, vocabulary,
          and coaching to your current level. Free talk never changes lesson
          progress.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100"
          >
            <ShieldCheck className="size-3.5" />
            Course progress stays unchanged
          </Badge>
          <Badge variant="secondary" className="rounded-full">
            Pick another topic anytime
          </Badge>
        </div>
      </header>

      {invalidTopicKey ? (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
        >
          That topic is not available. Choose one of the conversation topics
          below.
        </p>
      ) : null}

      <section
        aria-label="Conversation topics"
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FREE_TALK_TOPICS.map((topic) => (
          <Link
            key={topic.key}
            href={`/practice?mode=free&topicKey=${topic.key}`}
            className="group flex min-h-52 flex-col rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transform-none motion-reduce:transition-none dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-400/50"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-2xl dark:bg-emerald-500/15"
              >
                {topic.emoji}
              </span>
              <ArrowRight className="size-5 text-zinc-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-zinc-500" />
            </div>
            <h2 className="mt-5 text-lg font-black">{topic.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {topic.description}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              <span>{topic.recommendedLevel}</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3.5" />
                {topic.minutes} min
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
