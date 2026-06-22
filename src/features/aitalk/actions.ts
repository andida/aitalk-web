'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  AITALK_APP_HOME,
  AITALK_LOGIN_PATH,
  AITALK_ONBOARDING_PATH,
} from './constants';
import {
  completeLessonProgress,
  createOrUpdateLearningPlan,
  getTextSpeech,
  invokeCourseTutorAgent,
  startLessonProgress,
  updateCurrentLearningPlanLesson,
  upsertProfile,
} from './data';
import { withLocale } from './lib/paths';
import { createAitalkServerClient } from './supabase/server';
import type { OnboardingInput } from './types';

const WINDOWS_1252_REVERSE_MAP: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

const MOJIBAKE_PATTERN =
  /(?:[ÃÂâ][\u0080-\u00ff\u20ac\u2018-\u201d\u2026]|[äåæçèé][\u0080-\u00ff\u20ac\u2018-\u201d])/;

function repairMojibake(value: string) {
  if (!MOJIBAKE_PATTERN.test(value)) return value;

  const bytes: number[] = [];
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) return value;
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const mapped = WINDOWS_1252_REVERSE_MAP[codePoint];
    if (mapped === undefined) return value;
    bytes.push(mapped);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      new Uint8Array(bytes)
    );
  } catch {
    return value;
  }
}

function normalizeTutorPayload<T>(value: T): T {
  if (typeof value === 'string') {
    return repairMojibake(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTutorPayload(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeTutorPayload(item),
      ])
    ) as T;
  }
  return value;
}

function getStringAtPath(value: unknown, path: string[]) {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return '';
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current.trim() : '';
}

function resolveTutorReply(data: unknown) {
  const paths = [
    ['assistant_message'],
    ['assistantMessage'],
    ['assistant', 'message'],
    ['response', 'assistant_message'],
    ['data', 'assistant_message'],
    ['message'],
    ['reply'],
    ['text'],
    ['content'],
    ['main_reply'],
    ['spoken_text'],
    ['data'],
  ];

  for (const path of paths) {
    const value = getStringAtPath(data, path);
    if (value) return value;
  }

  return 'Good start. Try answering with one more detail and speak it out loud.';
}

function parseOnboarding(formData: FormData): OnboardingInput {
  const dailyStudyMinutes = Number.parseInt(
    String(formData.get('dailyStudyMinutes') || '10'),
    10
  );

  return {
    nativeLanguage: String(formData.get('nativeLanguage') || ''),
    nativeLanguageCode: String(formData.get('nativeLanguageCode') || ''),
    learnLanguage: String(formData.get('learnLanguage') || ''),
    learnLanguageCode: String(formData.get('learnLanguageCode') || ''),
    levelLanguage: String(formData.get('levelLanguage') || ''),
    learningGoal: String(formData.get('learningGoal') || ''),
    learningFocus: String(formData.get('learningFocus') || ''),
    dailyStudyMinutes: Number.isFinite(dailyStudyMinutes)
      ? dailyStudyMinutes
      : 10,
    nickName: String(formData.get('nickName') || ''),
  };
}

export async function completeOnboardingAction(
  locale: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  try {
    const supabase = await createAitalkServerClient();
    const payload = parseOnboarding(formData);

    const missing = Object.entries(payload).filter(([, value]) => {
      return (
        value === undefined || value === null || String(value).length === 0
      );
    });
    if (missing.length > 0) {
      return { error: 'Please complete every onboarding field.' };
    }

    await upsertProfile(supabase, {
      ...payload,
      onboardingCompletedAt: new Date().toISOString(),
    });
    await createOrUpdateLearningPlan(supabase);
  } catch (error: any) {
    return {
      error: error?.message || 'Unable to save onboarding. Please try again.',
    };
  }

  revalidatePath(withLocale(AITALK_APP_HOME, locale));
  redirect(withLocale(AITALK_APP_HOME, locale));
}

export async function startLessonAction(
  locale: string,
  lessonId: number,
  planId?: number | null
) {
  const supabase = await createAitalkServerClient();
  if (planId) {
    await updateCurrentLearningPlanLesson(supabase, planId, lessonId);
  }
  await startLessonProgress(supabase, lessonId, planId);
  revalidatePath(withLocale('/lessons', locale));
  redirect(withLocale(`/lessons/${lessonId}`, locale));
}

export async function completeLessonAction(
  locale: string,
  lessonId: number,
  planId?: number | null
) {
  const supabase = await createAitalkServerClient();
  await completeLessonProgress(supabase, lessonId, planId);
  revalidatePath(withLocale('/lessons', locale));
  revalidatePath(withLocale(`/lessons/${lessonId}`, locale));
}

export async function signOutAction(locale: string) {
  const supabase = await createAitalkServerClient();
  await supabase.auth.signOut();
  redirect(withLocale(AITALK_LOGIN_PATH, locale));
}

export async function askTutorAction(input: {
  chatTopic?: string;
  learnLanguage?: string;
  lessonCompleted?: boolean;
  lessonId?: number;
  lessonMode?: string;
  nativeLanguage?: string;
  planId?: number;
  requiredTurns?: number;
  successCriteria?: string[];
  teacherName?: string;
  text: string;
  locale?: string;
  messages?: Array<{ role: string; content: string }>;
}) {
  const supabase = await createAitalkServerClient();
  const text = input.text.trim();
  if (!text) {
    return { error: 'Please enter a sentence first.' };
  }

  const data = await invokeCourseTutorAgent(supabase, {
    learn_language: input.learnLanguage,
    lesson_id: input.lessonId,
    native_language: input.nativeLanguage,
    plan_id: input.planId,
    teacher_name: input.teacherName,
    chat_topic: input.chatTopic,
    lesson_completed: input.lessonCompleted ?? false,
    lesson_mode: input.lessonMode,
    required_turns: input.requiredTurns ?? 4,
    success_criteria: input.successCriteria ?? [],
    auto_send: false,
    labels: {
      hint: 'Hint',
      you_can_say: 'You can say',
    },
    message: text,
    messages: input.messages ?? [],
    source: 'web',
  });

  const normalizedData = normalizeTutorPayload(data);
  const reply = resolveTutorReply(normalizedData);

  return { reply, raw: normalizedData };
}

export async function textSpeechAction(input: {
  text: string;
  name?: string;
  lang?: string;
  style?: string;
}) {
  const supabase = await createAitalkServerClient();
  const text = input.text.trim();
  if (!text) return { error: 'Text is required.' };

  const data = await getTextSpeech(supabase, {
    text,
    rate: 1,
    name: input.name || 'en-US-JennyNeural',
    lang: input.lang || 'en-US',
    style: input.style || 'chat',
  });

  return { data };
}

export async function ensureOnboardingOrRedirect(locale: string) {
  redirect(withLocale(AITALK_ONBOARDING_PATH, locale));
}
