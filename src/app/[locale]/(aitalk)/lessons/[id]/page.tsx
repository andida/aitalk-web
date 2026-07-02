import { notFound, redirect } from 'next/navigation';
import {
  displayLessonSubtitle,
  displayLessonTitle,
  getActiveLearningPlan,
  getLatestLessonAttempt,
  getLessonById,
  getLessonI18n,
  getLessonProgress,
  getLessonStepI18nMap,
  getLessonSteps,
  getProfile,
  getProfileCompleteness,
  startLessonProgress,
} from '@/features/aitalk/data';
import { withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';
import type {
  CourseLessonStep,
  CourseStepContent,
  JsonRecord,
  LessonAttempt,
  TutorCriteriaStatus,
  TutorPracticeReport,
} from '@/features/aitalk/types';
import { AitalkAppShell } from '@/features/aitalk/ui/app-shell';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const lessonId = Number.parseInt(id, 10);
  if (!Number.isFinite(lessonId)) notFound();

  const supabase = await createAitalkServerClient();
  const profile = await getProfile(supabase).catch(() => null);
  if (!getProfileCompleteness(profile)) {
    redirect(withLocale('/onboarding', locale));
  }

  const activePlan = await getActiveLearningPlan(supabase).catch(() => null);
  const lesson = await getLessonById(supabase, lessonId);
  if (!lesson) notFound();

  if (activePlan?.plan?.id) {
    await startLessonProgress(supabase, lessonId, activePlan.plan.id).catch(
      () => null
    );
  }

  const [i18n, steps, progress, latestAttempt] = await Promise.all([
    getLessonI18n(supabase, lessonId, profile).catch(() => null),
    getLessonSteps(supabase, lessonId).catch(() => []),
    getLessonProgress(supabase, lessonId).catch(() => null),
    getLatestLessonAttempt(supabase, lessonId).catch(() => null),
  ]);
  const stepI18n = await getLessonStepI18nMap(supabase, steps, profile).catch(
    () => new Map()
  );
  const isCompleted = progress?.status === 'completed';

  return (
    <AitalkAppShell active="/lessons">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <section className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge className="rounded-full bg-emerald-500 text-white">
                {isCompleted ? 'Completed' : 'In progress'}
              </Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                {displayLessonTitle(lesson, i18n)}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base dark:text-zinc-300">
                {displayLessonSubtitle(lesson, i18n)}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
              >
                <Link href="/lessons">
                  <ArrowLeft className="size-5" />
                  Back to lessons
                </Link>
              </Button>
              {isCompleted ? (
                <>
                  <Button
                    asChild
                    className="h-11 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    <Link href={`/practice?lesson=${lesson.id}`}>
                      <RotateCcw className="size-5" />
                      Review
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                  >
                    <Link href={`/practice?lesson=${lesson.id}&mode=free`}>
                      <MessageCircle className="size-5" />
                      Free talk
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  className="h-11 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  <Link href={`/practice?lesson=${lesson.id}`}>
                    <MessageCircle className="size-5" />
                    Continue practice
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <LatestAttemptReport attempt={latestAttempt} />

        <section className="mt-6 grid gap-3">
          {(steps.length > 0 ? steps : fallbackSteps(lesson)).map(
            (step, index) => {
              const translated = stepI18n.get(step.id);
              const content = chooseStepContent(
                step.content,
                translated?.content
              );
              const instruction =
                translated?.instruction ||
                translated?.prompt ||
                step.prompt ||
                step.instruction;
              return (
                <div
                  key={step.id || index}
                  className="rounded-3xl border border-emerald-950/10 bg-white p-5 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-black">
                          {translated?.title ||
                            step.title ||
                            stepTypeLabel(step.step_type || step.type) ||
                            `Step ${index + 1}`}
                        </div>
                        {step.step_type || step.type ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full text-xs"
                          >
                            {stepTypeLabel(step.step_type || step.type)}
                          </Badge>
                        ) : null}
                      </div>
                      {instruction ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          {instruction}
                        </p>
                      ) : null}
                      <div className="mt-4">
                        <StepContent
                          stepType={step.step_type || step.type}
                          content={content}
                          scoringRubric={step.scoring_rubric}
                        />
                      </div>
                      {translated?.example || step.example ? (
                        <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
                          {translated?.example || step.example}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </section>
      </div>
    </AitalkAppShell>
  );
}

function StepContent({
  stepType,
  content,
  scoringRubric,
}: {
  stepType?: string | null;
  content: unknown;
  scoringRubric?: unknown;
}) {
  const type = (stepType || '').toLowerCase();
  const parsed = parseStepContent(content);
  const rubric = parseStepContent(scoringRubric);

  if (type === 'goal') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <InfoBlock label="Goal" value={parsed.outcome} />
        <InfoBlock label="Scene" value={parsed.scenario} />
        <CriteriaList criteria={stringList(parsed.success_criteria)} />
      </div>
    );
  }

  if (type === 'listen') {
    return (
      <NumberedList
        items={stringList(parsed.listen_text)}
        fallback={stringifyContent(content)}
      />
    );
  }

  if (type === 'chunks') {
    const chunks = stringList(parsed.target_chunks);
    return chunks.length ? (
      <div className="flex flex-wrap gap-2">
        {chunks.map((chunk) => (
          <Badge
            key={chunk}
            variant="secondary"
            className="rounded-full px-3 py-1 text-sm"
          >
            {chunk}
          </Badge>
        ))}
      </div>
    ) : (
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {stringifyContent(content)}
      </p>
    );
  }

  if (type === 'drill') {
    return (
      <NumberedList
        items={stringList(parsed.sentence_patterns)}
        fallback={stringifyContent(content)}
      />
    );
  }

  if (type === 'roleplay') {
    const criteria = stringList(
      parsed.success_criteria?.length
        ? parsed.success_criteria
        : rubric.success_criteria
    );
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoBlock label="Scene" value={parsed.scenario} />
          <InfoBlock label="AI role" value={parsed.ai_role} />
          <InfoBlock label="Your task" value={parsed.user_goal} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full bg-emerald-500 text-white">
            {parsed.required_turns || rubric.required_turns || 4} turns
          </Badge>
          <Badge variant="outline" className="rounded-full">
            AI checks completion
          </Badge>
        </div>
        <CriteriaList criteria={criteria} />
      </div>
    );
  }

  return (
    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
      {stringifyContent(content)}
    </p>
  );
}

function LatestAttemptReport({ attempt }: { attempt: LessonAttempt | null }) {
  const report = parseAttemptReport(attempt);
  if (!report) return null;
  const metCount = report.criteria_status.filter(
    (item) => item.status === 'met'
  ).length;

  return (
    <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/30 dark:bg-emerald-500/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-200">
            <Sparkles className="size-4" />
            Last AI speaking report
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-950/75 dark:text-emerald-50/75">
            {report.feedback_summary ||
              'Review the checklist and repeat the weak spots before the next lesson.'}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center shadow-sm dark:bg-white/10">
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-200">
            {report.score}
          </div>
          <div className="text-xs font-bold text-emerald-900/60 dark:text-emerald-50/60">
            overall
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoBlock
          label="Completed goals"
          value={`${metCount}/${report.criteria_status.length || metCount}`}
        />
        <InfoBlock
          label="Review"
          value={report.review_items.slice(0, 2).join('; ')}
        />
        <InfoBlock
          label="Improve"
          value={report.weak_points.slice(0, 2).join('; ')}
        />
      </div>
      {report.improved_sentence?.improved ? (
        <div className="mt-4 rounded-2xl bg-white p-3 text-sm leading-6 text-emerald-950 dark:bg-white/10 dark:text-emerald-50">
          <span className="font-black">Better sentence: </span>
          {report.improved_sentence.improved}
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value?: unknown }) {
  const text =
    typeof value === 'string' ? value.trim() : value ? String(value) : '';
  if (!text) return null;
  return (
    <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/10">
      <div className="text-xs font-black text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-sm leading-6 text-zinc-800 dark:text-zinc-100">
        {text}
      </div>
    </div>
  );
}

function CriteriaList({ criteria }: { criteria: string[] }) {
  if (criteria.length === 0) return null;
  return (
    <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/10">
      <div className="mb-2 text-xs font-black text-zinc-500 uppercase dark:text-zinc-400">
        Pass checklist
      </div>
      <div className="grid gap-2">
        {criteria.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm leading-5">
            <CircleDot className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberedList({
  items,
  fallback,
}: {
  items: string[];
  fallback: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {fallback}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3 text-sm leading-6 dark:bg-white/10"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
            {index + 1}
          </div>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function parseAttemptReport(
  attempt: LessonAttempt | null
): TutorPracticeReport | null {
  if (!attempt?.feedback || typeof attempt.feedback !== 'object') return null;
  const feedback = attempt.feedback as JsonRecord;
  const scores = attempt.scores || {};
  const score = numberValue(feedback.score) ?? numberValue(scores.overall) ?? 0;
  return {
    score,
    criteria_status: criteriaStatusList(feedback.criteria_status),
    target_chunks_used: stringList(feedback.target_chunks_used),
    feedback_summary:
      typeof feedback.feedback_summary === 'string'
        ? feedback.feedback_summary
        : null,
    weak_points: stringList(feedback.weak_points),
    review_items: stringList(feedback.review_items),
    improved_sentence:
      feedback.improved_sentence &&
      typeof feedback.improved_sentence === 'object' &&
      typeof (feedback.improved_sentence as JsonRecord).improved === 'string'
        ? {
            original:
              typeof (feedback.improved_sentence as JsonRecord).original ===
              'string'
                ? ((feedback.improved_sentence as JsonRecord)
                    .original as string)
                : null,
            improved: (feedback.improved_sentence as JsonRecord)
              .improved as string,
            reason:
              typeof (feedback.improved_sentence as JsonRecord).reason ===
              'string'
                ? ((feedback.improved_sentence as JsonRecord).reason as string)
                : null,
          }
        : null,
  };
}

function criteriaStatusList(value: unknown): TutorCriteriaStatus[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as JsonRecord;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const status =
        record.status === 'met' || record.status === 'missed'
          ? record.status
          : 'pending';
      if (!label) return null;
      return {
        label,
        status,
        evidence:
          typeof record.evidence === 'string' ? record.evidence.trim() : null,
      } satisfies TutorCriteriaStatus;
    })
    .filter(Boolean) as TutorCriteriaStatus[];
}

function chooseStepContent(primary: unknown, translated: unknown) {
  if (!translated) return primary;
  if (typeof translated === 'string')
    return translated.trim() ? translated : primary;
  if (typeof translated === 'object' && Object.keys(translated).length > 0) {
    return translated;
  }
  return primary;
}

function parseStepContent(content: unknown): CourseStepContent {
  if (!content) return {};
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return parsed && typeof parsed === 'object'
        ? (parsed as CourseStepContent)
        : {};
    } catch {
      return { text: content };
    }
  }
  if (typeof content === 'object') return content as CourseStepContent;
  return {};
}

function stepTypeLabel(type?: string | null) {
  switch ((type || '').toLowerCase()) {
    case 'goal':
      return 'Goal';
    case 'listen':
      return 'Listen';
    case 'chunks':
      return 'Chunks';
    case 'drill':
      return 'Drill';
    case 'roleplay':
      return 'Roleplay';
    default:
      return '';
  }
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function stringifyContent(content: unknown) {
  if (!content) return 'Read the prompt, say your answer, then continue.';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    const record = content as Record<string, unknown>;
    return String(
      record.instruction ||
        record.prompt ||
        record.text ||
        record.sentence ||
        Object.values(record).find((value) => typeof value === 'string') ||
        'Practice this step out loud.'
    );
  }
  return String(content);
}

function fallbackSteps(lesson: any): CourseLessonStep[] {
  return [
    {
      id: 0,
      lesson_id: lesson.id,
      title: 'Words',
      content: lesson.lesson_words || 'Review the key words for this lesson.',
      status: 1,
    },
    {
      id: 1,
      lesson_id: lesson.id,
      title: 'Sentence',
      content:
        lesson.lesson_sentence ||
        'Say one useful sentence connected to this lesson.',
      status: 1,
    },
    {
      id: 2,
      lesson_id: lesson.id,
      title: 'Free answer',
      content: 'Use the practice page to answer in your own words.',
      status: 1,
    },
  ];
}
