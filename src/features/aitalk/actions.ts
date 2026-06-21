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
  lessonId?: number;
  nativeLanguage?: string;
  planId?: number;
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
    required_turns: 4,
    success_criteria: [],
    auto_send: false,
    labels: {
      hint: 'Hint',
      you_can_say: 'You can say',
    },
    message: text,
    messages: input.messages ?? [],
    source: 'web',
  });

  const reply =
    data?.reply ||
    data?.text ||
    data?.message ||
    data?.content ||
    data?.data ||
    'Good start. Try answering with one more detail and speak it out loud.';

  return { reply: String(reply), raw: data };
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
