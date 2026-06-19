'use client';

import { useActionState, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  GraduationCap,
  Headphones,
  Languages,
  Loader2,
  Map,
  MessageCircle,
  Mic2,
  Plane,
  Sparkles,
  Star,
  Target,
  Timer,
  Users,
  Volume2,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

import { completeOnboardingAction } from '../actions';
import {
  DAILY_MINUTE_OPTIONS,
  FLAG_BY_LANGUAGE,
  LEVEL_OPTIONS,
  ONBOARDING_FOCUS,
  ONBOARDING_GOALS,
} from '../constants';
import type { AitalkLanguage, AitalkProfile } from '../types';

type StepId =
  | 'native'
  | 'learn'
  | 'level'
  | 'goal'
  | 'focus'
  | 'minutes'
  | 'name'
  | 'review';

type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

type WizardState = {
  nativeLanguage: string;
  learnLanguage: string;
  levelLanguage: string;
  learningGoal: string;
  learningFocus: string;
  dailyStudyMinutes: number;
  nickName: string;
};

const steps: Array<{ id: StepId; label: string; mobileLabel: string }> = [
  { id: 'native', label: 'Native language', mobileLabel: 'Native' },
  { id: 'learn', label: 'Learning language', mobileLabel: 'Learn' },
  { id: 'level', label: 'Current level', mobileLabel: 'Level' },
  { id: 'goal', label: 'Learning goal', mobileLabel: 'Goal' },
  { id: 'focus', label: 'Practice focus', mobileLabel: 'Focus' },
  { id: 'minutes', label: 'Daily goal', mobileLabel: 'Minutes' },
  { id: 'name', label: 'Nickname', mobileLabel: 'Name' },
  { id: 'review', label: 'Review plan', mobileLabel: 'Review' },
];

const goalIcons = {
  travel: Plane,
  career: Briefcase,
  conversation: MessageCircle,
  exam: GraduationCap,
  interest: Star,
  social: Users,
} as const;

const focusIcons = {
  confidence: Mic2,
  listening: Headphones,
  pronunciation: Volume2,
  vocabulary: Sparkles,
  real_conversation: Target,
  grammar: CheckCircle2,
} as const;

const levelIcons = [CircleUserRound, MessageCircle, Mic2, Target, Sparkles];

function findLanguage(languages: AitalkLanguage[], name: string) {
  return languages.find((language) => language.language_name === name);
}

function defaultLanguage(
  languages: AitalkLanguage[],
  preferred: string | null | undefined
) {
  return (
    preferred ||
    languages.find((language) => language.language_name === 'English')
      ?.language_name ||
    languages[0]?.language_name ||
    'English'
  );
}

function flagFor(languageName: string) {
  return FLAG_BY_LANGUAGE[languageName] || languageName.slice(0, 2).toUpperCase();
}

function optionLabel(options: ChoiceOption[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

function minutesLabel(value: number) {
  return (
    DAILY_MINUTE_OPTIONS.find((option) => option.value === value)?.label ||
    `${value} minutes / day`
  );
}

function getInitialState(
  languages: AitalkLanguage[],
  profile: AitalkProfile | null
): WizardState {
  return {
    nativeLanguage: defaultLanguage(languages, profile?.native_language),
    learnLanguage: defaultLanguage(languages, profile?.learn_language),
    levelLanguage: profile?.level_language || '1',
    learningGoal: profile?.learning_goal || 'conversation',
    learningFocus: profile?.learning_focus || 'confidence',
    dailyStudyMinutes: profile?.daily_study_minutes || 10,
    nickName: profile?.nick_name || '',
  };
}

export function OnboardingForm({
  locale,
  languages,
  profile,
}: {
  locale: string;
  languages: AitalkLanguage[];
  profile: AitalkProfile | null;
}) {
  const action = useMemo(
    () => completeOnboardingAction.bind(null, locale),
    [locale]
  );
  const [actionState, formAction, pending] = useActionState(action, undefined);
  const [currentStep, setCurrentStep] = useState(0);
  const [wizard, setWizard] = useState(() => getInitialState(languages, profile));

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const native = findLanguage(languages, wizard.nativeLanguage);
  const learn = findLanguage(languages, wizard.learnLanguage);
  const canContinue =
    step.id !== 'name' || wizard.nickName.trim().length >= 1 || pending;

  const selectedSummary = [
    {
      label: 'Native',
      value: wizard.nativeLanguage,
    },
    {
      label: 'Learn',
      value: wizard.learnLanguage,
    },
    {
      label: 'Level',
      value: optionLabel(LEVEL_OPTIONS, wizard.levelLanguage),
    },
    {
      label: 'Goal',
      value: optionLabel(ONBOARDING_GOALS, wizard.learningGoal),
    },
    {
      label: 'Focus',
      value: optionLabel(ONBOARDING_FOCUS, wizard.learningFocus),
    },
    {
      label: 'Daily',
      value: minutesLabel(wizard.dailyStudyMinutes),
    },
  ];

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setWizard((previous) => ({ ...previous, [key]: value }));
  }

  function goNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((value) => value + 1);
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setCurrentStep((value) => value - 1);
    }
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="nativeLanguage" value={wizard.nativeLanguage} />
      <input
        type="hidden"
        name="nativeLanguageCode"
        value={native?.language_code || 'en-US'}
      />
      <input type="hidden" name="learnLanguage" value={wizard.learnLanguage} />
      <input
        type="hidden"
        name="learnLanguageCode"
        value={learn?.language_code || 'en-US'}
      />
      <input type="hidden" name="levelLanguage" value={wizard.levelLanguage} />
      <input type="hidden" name="learningGoal" value={wizard.learningGoal} />
      <input type="hidden" name="learningFocus" value={wizard.learningFocus} />
      <input
        type="hidden"
        name="dailyStudyMinutes"
        value={String(wizard.dailyStudyMinutes)}
      />
      <input type="hidden" name="nickName" value={wizard.nickName.trim()} />

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-4 lg:block dark:border-white/10 dark:bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-sm font-black">AITalk setup</div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Shared with your app account
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {steps.map((item, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition',
                    isActive
                      ? 'bg-white text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-200'
                      : 'text-zinc-500 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-white/5'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs',
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-400'
                    )}
                  >
                    {isDone ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-white/10">
            <div className="font-black">Current choices</div>
            <div className="mt-3 grid gap-2">
              {selectedSummary.map((item) => (
                <div key={item.label} className="flex justify-between gap-3">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {item.label}
                  </span>
                  <span className="max-w-36 truncate text-right font-bold">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6 dark:border-white/10 dark:bg-white/5">
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span className="text-emerald-700 dark:text-emerald-300">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {step.mobileLabel}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-rose-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {step.id === 'native' ? (
            <LanguageStep
              title="My native language is"
              subtitle="Your AI coach uses this for hints, translations, and lesson explanations."
              languages={languages}
              selected={wizard.nativeLanguage}
              onSelect={(value) => {
                update('nativeLanguage', value);
                goNext();
              }}
            />
          ) : null}

          {step.id === 'learn' ? (
            <LanguageStep
              title="I want to learn"
              subtitle="This controls teachers, courses, speaking scenarios, and text-to-speech voices."
              languages={languages}
              selected={wizard.learnLanguage}
              onSelect={(value) => {
                update('learnLanguage', value);
                goNext();
              }}
              compact
            />
          ) : null}

          {step.id === 'level' ? (
            <ChoiceStep
              title={`How about your ${wizard.learnLanguage}?`}
              subtitle="Pick the closest level. You can change it later in your profile."
              options={LEVEL_OPTIONS}
              selected={wizard.levelLanguage}
              iconForIndex={(index) => levelIcons[index] || CircleUserRound}
              onSelect={(value) => {
                update('levelLanguage', value);
                goNext();
              }}
            />
          ) : null}

          {step.id === 'goal' ? (
            <ChoiceStep
              title="Why do you want to improve your speaking?"
              subtitle="AITalk will use this to pick your first speaking path."
              options={ONBOARDING_GOALS}
              selected={wizard.learningGoal}
              iconForValue={(value) =>
                goalIcons[value as keyof typeof goalIcons] || Target
              }
              onSelect={(value) => {
                update('learningGoal', value);
                goNext();
              }}
            />
          ) : null}

          {step.id === 'focus' ? (
            <ChoiceStep
              title="What do you want to improve first?"
              subtitle="This tunes AI feedback and the kinds of exercises you see first."
              options={ONBOARDING_FOCUS}
              selected={wizard.learningFocus}
              iconForValue={(value) =>
                focusIcons[value as keyof typeof focusIcons] || Mic2
              }
              onSelect={(value) => {
                update('learningFocus', value);
                goNext();
              }}
            />
          ) : null}

          {step.id === 'minutes' ? (
            <ChoiceStep
              title="What is your daily learning goal?"
              subtitle="Short daily speaking sessions work better than rare long sessions."
              options={DAILY_MINUTE_OPTIONS.map((option) => ({
                value: String(option.value),
                label: option.label,
                description: option.description,
              }))}
              selected={String(wizard.dailyStudyMinutes)}
              iconForIndex={() => Timer}
              onSelect={(value) => {
                update('dailyStudyMinutes', Number.parseInt(value, 10));
                goNext();
              }}
            />
          ) : null}

          {step.id === 'name' ? (
            <NameStep
              value={wizard.nickName}
              onChange={(value) => update('nickName', value)}
              onEnter={() => {
                if (wizard.nickName.trim()) goNext();
              }}
            />
          ) : null}

          {step.id === 'review' ? (
            <ReviewStep
              name={wizard.nickName.trim() || 'Learner'}
              summary={selectedSummary}
              nativeCode={native?.language_code || 'en-US'}
              learnCode={learn?.language_code || 'en-US'}
            />
          ) : null}

          {actionState?.error ? (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {actionState.error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 0 || pending}
              className="h-11 rounded-xl"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={!canContinue || pending}
                className="h-11 rounded-xl bg-emerald-500 px-5 font-black text-white hover:bg-emerald-600"
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={pending}
                className="h-11 rounded-xl bg-emerald-500 px-5 font-black text-white hover:bg-emerald-600"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Build my plan
              </Button>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}

function LanguageStep({
  title,
  subtitle,
  languages,
  selected,
  onSelect,
  compact = false,
}: {
  title: string;
  subtitle: string;
  languages: AitalkLanguage[];
  selected: string;
  onSelect: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <StepHeader icon={Languages} title={title} subtitle={subtitle} />
      <div
        className={cn(
          'mt-6 grid gap-3',
          compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
        )}
      >
        {languages.map((language) => (
          <button
            key={`${language.language_code}-${language.language_name}`}
            type="button"
            onClick={() => onSelect(language.language_name)}
            className={cn(
              'group flex min-h-20 items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 dark:bg-white/5 dark:hover:bg-emerald-500/10',
              selected === language.language_name
                ? 'border-emerald-500 ring-2 ring-emerald-500/15'
                : 'border-zinc-200 dark:border-white/10'
            )}
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              {flagFor(language.language_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-black">
                {language.language_name}
              </span>
              <span className="block truncate text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {language.native_name}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-emerald-500 transition group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceStep({
  title,
  subtitle,
  options,
  selected,
  onSelect,
  iconForValue,
  iconForIndex,
}: {
  title: string;
  subtitle: string;
  options: ChoiceOption[];
  selected: string;
  onSelect: (value: string) => void;
  iconForValue?: (value: string) => ElementType;
  iconForIndex?: (index: number) => ElementType;
}) {
  return (
    <div>
      <StepHeader icon={Map} title={title} subtitle={subtitle} />
      <div className="mt-6 grid gap-3">
        {options.map((option, index) => {
          const Icon =
            iconForValue?.(option.value) ||
            iconForIndex?.(index) ||
            CheckCircle2;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'group flex min-h-20 items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 dark:bg-white/5 dark:hover:bg-emerald-500/10',
                selected === option.value
                  ? 'border-emerald-500 ring-2 ring-emerald-500/15'
                  : 'border-zinc-200 dark:border-white/10'
              )}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-black">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-1 block text-sm font-semibold leading-5 text-zinc-500 dark:text-zinc-400">
                    {option.description}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="size-5 shrink-0 text-emerald-500 transition group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NameStep({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <div>
      <StepHeader
        icon={CircleUserRound}
        title="What's your name?"
        subtitle="Your tutor will use this name in speaking feedback and lesson prompts."
      />
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Sparkles className="size-5" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm font-bold leading-6 shadow-sm dark:bg-white/10">
            Hi, would you mind sharing your name?
          </div>
        </div>
        <div className="mt-4 pl-0 md:pl-14">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onEnter();
              }
            }}
            autoFocus
            placeholder="What should your tutor call you?"
            className="h-12 rounded-2xl border-dashed bg-white text-center text-base font-bold dark:bg-white/10"
          />
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  name,
  summary,
  nativeCode,
  learnCode,
}: {
  name: string;
  summary: Array<{ label: string; value: string }>;
  nativeCode: string;
  learnCode: string;
}) {
  return (
    <div>
      <StepHeader
        icon={CheckCircle2}
        title={`Ready, ${name}`}
        subtitle="AITalk will save this profile and create or refresh your active learning plan."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className="text-xs font-black uppercase text-zinc-400">
              {item.label}
            </div>
            <div className="mt-2 truncate text-base font-black">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
        This profile will sync with your app account. Language settings: native{' '}
        {nativeCode}, learning {learnCode}.
      </div>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
        <Icon className="size-6" />
      </div>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-500 md:text-base dark:text-zinc-300">
        {subtitle}
      </p>
    </div>
  );
}
