import type { SupabaseClient } from '@supabase/supabase-js';

import {
  DEFAULT_DAILY_MINUTES,
  DEFAULT_LEARN_LANGUAGE,
  DEFAULT_NATIVE_LANGUAGE,
} from './constants';
import type {
  ActiveLearningPlan,
  AitalkCollect,
  AitalkLanguage,
  AitalkProfile,
  AitalkTeacher,
  AitalkUsage,
  CourseLessonI18n,
  CourseLessonStep,
  CourseLessonStepI18n,
  LessonListDetail,
  OnboardingInput,
  TopicExercise,
  UserLearningPlan,
  UserLearningPlanItem,
  UserLessonProgress,
} from './types';

type Client = SupabaseClient<any, any, any>;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function first<T>(value: T[] | null | undefined): T | null {
  return value && value.length > 0 ? value[0] : null;
}

function textEqual(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function lessonLevel(lesson: LessonListDetail) {
  return lesson.level_id ?? lesson.levelId ?? null;
}

function lessonGoal(lesson: LessonListDetail) {
  return lesson.goal_type ?? lesson.goalType ?? null;
}

function lessonFocus(lesson: LessonListDetail) {
  return lesson.focus_type ?? lesson.focusType ?? null;
}

function lessonSort(lesson: LessonListDetail) {
  return lesson.sort_order ?? lesson.sortOrder ?? lesson.id;
}

function scoreLesson(
  lesson: LessonListDetail,
  {
    learnLanguage,
    nativeLanguage,
    level,
    goal,
    focus,
  }: {
    learnLanguage: string;
    nativeLanguage?: string | null;
    level?: number | null;
    goal?: string | null;
    focus?: string | null;
  }
) {
  let score = 0;
  if (textEqual(lesson.language, learnLanguage)) score += 40;
  if (nativeLanguage && textEqual(lesson.native_language, nativeLanguage)) {
    score += 10;
  }
  if (level != null && lessonLevel(lesson) === level) score += 20;
  if (goal && textEqual(lessonGoal(lesson), goal)) score += 25;
  if (focus && textEqual(lessonFocus(lesson), focus)) score += 15;
  if (lessonSort(lesson) != null) score += 5;
  return score;
}

export function displayLessonTitle(
  lesson: LessonListDetail | null,
  i18n?: CourseLessonI18n | null
) {
  if (!lesson) return 'Today practice';
  return (
    i18n?.title ||
    lesson.lesson_name ||
    lesson.title ||
    lesson.name ||
    lesson.subtitle ||
    `Lesson ${lesson.id}`
  );
}

export function displayLessonSubtitle(
  lesson: LessonListDetail | null,
  i18n?: CourseLessonI18n | null
) {
  if (!lesson) return 'Start a short speaking session with your AI tutor.';
  return (
    i18n?.subtitle ||
    lesson.lesson_subtitle ||
    lesson.subtitle ||
    lesson.description ||
    lesson.content ||
    'Practice useful phrases and build speaking confidence.'
  );
}

export function displayTopicTitle(topic: TopicExercise | null) {
  if (!topic) return 'Topic practice';
  return topic.title || topic.name || `Topic ${topic.id}`;
}

export function displayTopicPrompt(topic: TopicExercise | null) {
  if (!topic) {
    return 'Open this prompt in practice and answer out loud.';
  }
  return (
    topic.desc ||
    topic.description ||
    topic.content ||
    'Open this prompt in practice and answer out loud.'
  );
}

export function buildTopicTutorPrompt(topic: TopicExercise | null) {
  if (!topic) {
    return 'Open this prompt in practice and answer out loud.';
  }

  const lines = [
    topic.desc ||
      topic.description ||
      topic.content ||
      displayTopicTitle(topic),
    topic.sub_title || topic.subTitle
      ? `Topic subtitle: ${topic.sub_title || topic.subTitle}`
      : '',
    topic.continue_desc || topic.continueDesc
      ? `Continue the conversation with: ${topic.continue_desc || topic.continueDesc}`
      : '',
    topic.tip_learn || topic.tipLearn
      ? `Target-language tip: ${topic.tip_learn || topic.tipLearn}`
      : '',
    topic.tip_native || topic.tipNative
      ? `Native-language tip: ${topic.tip_native || topic.tipNative}`
      : '',
    topic.learn_words || topic.learnWords
      ? `Useful words: ${topic.learn_words || topic.learnWords}`
      : '',
    topic.learn_sentences || topic.learnSentences
      ? `Useful sentences: ${topic.learn_sentences || topic.learnSentences}`
      : '',
  ];

  return lines.filter(Boolean).join('\n');
}

export function getProfileCompleteness(profile: AitalkProfile | null) {
  if (!profile) return false;
  return Boolean(
    profile.native_language &&
      profile.learn_language &&
      profile.level_language &&
      profile.learning_goal &&
      profile.learning_focus &&
      profile.daily_study_minutes &&
      profile.nick_name &&
      profile.learning_plan_created
  );
}

export async function requireUser(supabase: Client) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required');
  }

  return user;
}

export async function getProfile(supabase: Client) {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  if (error) throw error;
  return first(asArray<AitalkProfile>(data));
}

export async function upsertProfile(
  supabase: Client,
  input: Partial<OnboardingInput> & {
    learningPlanCreated?: boolean;
    onboardingCompletedAt?: string;
  }
) {
  const user = await requireUser(supabase);
  const current = await getProfile(supabase).catch(() => null);
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    user_id: user.id,
    updated_at: now,
  };

  const entries: [keyof OnboardingInput, string][] = [
    ['nativeLanguage', 'native_language'],
    ['nativeLanguageCode', 'native_language_code'],
    ['learnLanguage', 'learn_language'],
    ['learnLanguageCode', 'learn_language_code'],
    ['levelLanguage', 'level_language'],
    ['learningGoal', 'learning_goal'],
    ['learningFocus', 'learning_focus'],
    ['dailyStudyMinutes', 'daily_study_minutes'],
    ['nickName', 'nick_name'],
  ];

  for (const [source, target] of entries) {
    const value = input[source];
    if (value !== undefined && value !== null && String(value).length > 0) {
      payload[target] = value;
    }
  }

  if (input.learningPlanCreated !== undefined) {
    payload.learning_plan_created = input.learningPlanCreated;
  } else if (current?.learning_plan_created !== undefined) {
    payload.learning_plan_created = current.learning_plan_created;
  }

  if (input.onboardingCompletedAt) {
    payload.onboarding_completed_at = input.onboardingCompletedAt;
  } else if (current?.onboarding_completed_at) {
    payload.onboarding_completed_at = current.onboarding_completed_at;
  }

  const { data, error } = await supabase
    .from('profile')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .limit(1);

  if (error) throw error;
  return first(asArray<AitalkProfile>(data));
}

export async function getLanguages(supabase: Client) {
  const { data, error } = await supabase.from('languages').select('*');
  if (error) throw error;
  return asArray<AitalkLanguage>(data).sort((a, b) => {
    const sortA = a.sort ?? a.id ?? 0;
    const sortB = b.sort ?? b.id ?? 0;
    return sortA - sortB;
  });
}

export async function getTeachers(supabase: Client, learnLanguage?: string) {
  let query = supabase.from('teacher').select('*');
  if (learnLanguage) {
    query = query.eq('language', learnLanguage);
  }
  let { data, error } = await query;
  if (error) throw error;

  if (learnLanguage && asArray(data).length === 0) {
    const fallback = await supabase.from('teacher').select('*');
    data = fallback.data;
    error = fallback.error;
    if (error) throw error;
  }

  return asArray<AitalkTeacher>(data).sort((a, b) => {
    const sexA = Number(a.sex ?? 0);
    const sexB = Number(b.sex ?? 0);
    const indexA = Number(a.index ?? 0);
    const indexB = Number(b.index ?? 0);
    if (sexA !== sexB) return sexA - sexB;
    return indexA - indexB;
  });
}

export async function getTopicExercises(
  supabase: Client,
  nativeLanguage?: string | null
) {
  const language = nativeLanguage || DEFAULT_NATIVE_LANGUAGE;
  let { data, error } = await supabase
    .from('topic_exercise_list')
    .select('*')
    .eq('status', 1)
    .eq('native_language', language);

  if (error) throw error;

  if (asArray(data).length === 0 && language !== DEFAULT_NATIVE_LANGUAGE) {
    const fallback = await supabase
      .from('topic_exercise_list')
      .select('*')
      .eq('status', 1)
      .eq('native_language', DEFAULT_NATIVE_LANGUAGE);
    data = fallback.data;
    error = fallback.error;
    if (error) throw error;
  }

  return asArray<TopicExercise>(data);
}

export async function getTopicExerciseById(supabase: Client, topicId: number) {
  const { data, error } = await supabase
    .from('topic_exercise_list')
    .select('*')
    .eq('id', topicId)
    .eq('status', 1)
    .limit(1);

  if (error) throw error;
  return first(asArray<TopicExercise>(data));
}

export async function getLessons(supabase: Client, language?: string | null) {
  let query = supabase.from('lesson_list_detail').select('*');
  if (language) {
    query = query.eq('language', language);
  }
  const { data, error } = await query;
  if (error) throw error;
  return asArray<LessonListDetail>(data);
}

export async function getRecommendedLessons(
  supabase: Client,
  profile: AitalkProfile | null,
  limit = 20
) {
  const learnLanguage = profile?.learn_language || DEFAULT_LEARN_LANGUAGE;
  const nativeLanguage =
    profile?.native_language || profile?.native_language_code || null;
  const level = profile?.level_language
    ? Number.parseInt(profile.level_language, 10)
    : null;
  const goal = profile?.learning_goal || 'conversation';
  const focus = profile?.learning_focus || 'confidence';

  let lessons = await getLessons(supabase, learnLanguage);
  if (lessons.length === 0) {
    lessons = await getLessons(supabase);
  }

  const activeLessons = lessons.filter(
    (lesson) => lesson.status == null || lesson.status === 1
  );
  const levelLessons =
    level == null
      ? []
      : activeLessons.filter((lesson) => lessonLevel(lesson) === level);
  const candidateLessons =
    levelLessons.length > 0 ? levelLessons : activeLessons;

  const ranked = [...candidateLessons].sort((a, b) => {
    const scoreA = scoreLesson(a, {
      learnLanguage,
      nativeLanguage,
      level,
      goal,
      focus,
    });
    const scoreB = scoreLesson(b, {
      learnLanguage,
      nativeLanguage,
      level,
      goal,
      focus,
    });
    if (scoreA !== scoreB) return scoreB - scoreA;
    return lessonSort(a) - lessonSort(b);
  });

  return ranked.slice(0, limit).sort((a, b) => lessonSort(a) - lessonSort(b));
}

export async function getLessonById(supabase: Client, lessonId: number) {
  const { data, error } = await supabase
    .from('lesson_list_detail')
    .select('*')
    .eq('id', lessonId)
    .limit(1);
  if (error) throw error;
  return first(asArray<LessonListDetail>(data));
}

export async function getLessonI18n(
  supabase: Client,
  lessonId: number,
  profile: AitalkProfile | null
) {
  const nativeLanguage =
    profile?.native_language || profile?.native_language_code || null;
  if (!nativeLanguage) return null;
  const { data, error } = await supabase
    .from('course_lesson_i18n')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('native_language', nativeLanguage)
    .limit(1);
  if (error) throw error;
  return first(asArray<CourseLessonI18n>(data));
}

export async function getLessonSteps(supabase: Client, lessonId: number) {
  const { data, error } = await supabase
    .from('course_lesson_steps')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('status', 1)
    .order('step_order', { ascending: true });
  if (error) throw error;
  return asArray<CourseLessonStep>(data);
}

export async function getLessonStepI18nMap(
  supabase: Client,
  steps: CourseLessonStep[],
  profile: AitalkProfile | null
) {
  const nativeLanguage =
    profile?.native_language || profile?.native_language_code || null;
  if (!nativeLanguage || steps.length === 0)
    return new Map<number, CourseLessonStepI18n>();

  const { data, error } = await supabase
    .from('course_lesson_step_i18n')
    .select('*')
    .in(
      'step_id',
      steps.map((step) => step.id)
    )
    .eq('native_language', nativeLanguage);
  if (error) throw error;

  return new Map(
    asArray<CourseLessonStepI18n>(data).map((row) => [row.step_id, row])
  );
}

export async function getLearningPlanItems(supabase: Client, planId: number) {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from('user_learning_plan_items')
    .select('*, lesson_list_detail(*)')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .order('plan_order', { ascending: true });
  if (error) throw error;
  return asArray<UserLearningPlanItem>(data);
}

export async function createLearningPlanItems(
  supabase: Client,
  planId: number,
  lessons: LessonListDetail[]
) {
  const user = await requireUser(supabase);
  if (lessons.length === 0) return [];

  const rows = lessons.map((lesson, index) => ({
    plan_id: planId,
    user_id: user.id,
    lesson_id: lesson.id,
    plan_order: index + 1,
    status: index === 0 ? 'in_progress' : 'not_started',
    started_at: index === 0 ? new Date().toISOString() : null,
  }));

  const { data, error } = await supabase
    .from('user_learning_plan_items')
    .upsert(rows, { onConflict: 'plan_id,lesson_id' })
    .select('*, lesson_list_detail(*)')
    .order('plan_order', { ascending: true });
  if (error) throw error;
  return asArray<UserLearningPlanItem>(data);
}

export async function getLessonProgress(supabase: Client, lessonId: number) {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from('user_lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .limit(1);
  if (error) throw error;
  return first(asArray<UserLessonProgress>(data));
}

export async function startLessonProgress(
  supabase: Client,
  lessonId: number,
  planId?: number | null
) {
  const user = await requireUser(supabase);
  const existing = await getLessonProgress(supabase, lessonId).catch(
    () => null
  );
  const now = new Date().toISOString();
  const isCompleted = existing?.status === 'completed';
  const currentPercent = existing?.progress_percent ?? 0;
  const payload: Record<string, any> = {
    user_id: user.id,
    lesson_id: lessonId,
    status: isCompleted ? 'completed' : 'in_progress',
    progress_percent: isCompleted
      ? 100
      : currentPercent > 10
        ? currentPercent
        : 10,
    started_at: existing?.started_at ?? now,
    last_practiced_at: now,
    updated_at: now,
  };
  if (planId) payload.plan_id = planId;

  const { data, error } = await supabase
    .from('user_lesson_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select()
    .limit(1);
  if (error) throw error;

  if (planId && !isCompleted) {
    await markLearningPlanItemStarted(supabase, planId, lessonId);
  }

  return first(asArray<UserLessonProgress>(data));
}

export async function completeLessonProgress(
  supabase: Client,
  lessonId: number,
  planId?: number | null
) {
  const user = await requireUser(supabase);
  const existing = await getLessonProgress(supabase, lessonId).catch(
    () => null
  );
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    user_id: user.id,
    lesson_id: lessonId,
    status: 'completed',
    progress_percent: 100,
    started_at: existing?.started_at ?? now,
    completed_at: existing?.completed_at ?? now,
    last_practiced_at: now,
    updated_at: now,
  };
  if (planId) payload.plan_id = planId;

  const { data, error } = await supabase
    .from('user_lesson_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select()
    .limit(1);
  if (error) throw error;

  if (planId) {
    await markLearningPlanItemCompleted(supabase, planId, lessonId);
    await advanceLearningPlanAfterLesson(supabase, planId, lessonId);
  }

  return first(asArray<UserLessonProgress>(data));
}

export async function updateCurrentLearningPlanLesson(
  supabase: Client,
  planId: number,
  lessonId: number
) {
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from('user_learning_plans')
    .update({
      current_lesson_id: lessonId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .eq('user_id', user.id);
  if (error) throw error;
}

async function markLearningPlanItemStarted(
  supabase: Client,
  planId: number,
  lessonId: number
) {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from('user_learning_plan_items')
    .select('id,status,started_at')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .eq('lesson_id', lessonId)
    .limit(1);
  if (error) throw error;
  const item = first(asArray<any>(data));
  if (!item || item.status === 'completed') return;

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: 'in_progress',
    updated_at: now,
  };
  if (!item.started_at) updateData.started_at = now;

  const result = await supabase
    .from('user_learning_plan_items')
    .update(updateData)
    .eq('id', item.id)
    .eq('user_id', user.id);
  if (result.error) throw result.error;
}

async function markLearningPlanItemCompleted(
  supabase: Client,
  planId: number,
  lessonId: number
) {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from('user_learning_plan_items')
    .select('id,started_at')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .eq('lesson_id', lessonId)
    .limit(1);
  if (error) throw error;
  const item = first(asArray<any>(data));
  if (!item) return;

  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: 'completed',
    completed_at: now,
    updated_at: now,
  };
  if (!item.started_at) updateData.started_at = now;

  const result = await supabase
    .from('user_learning_plan_items')
    .update(updateData)
    .eq('id', item.id)
    .eq('user_id', user.id);
  if (result.error) throw result.error;
}

async function advanceLearningPlanAfterLesson(
  supabase: Client,
  planId: number,
  lessonId: number
) {
  const items = await getLearningPlanItems(supabase, planId);
  const current = items.find((item) => item.lesson_id === lessonId);
  if (!current) return;
  const next = items.find(
    (item) =>
      item.plan_order > current.plan_order && item.status !== 'completed'
  );
  if (next) {
    await updateCurrentLearningPlanLesson(supabase, planId, next.lesson_id);
  }
}

export async function createOrUpdateLearningPlan(supabase: Client) {
  const user = await requireUser(supabase);
  const profile = await getProfile(supabase);
  const lessons = await getRecommendedLessons(supabase, profile, 20);
  const lesson = lessons[0] ?? null;

  if (!lesson) {
    await upsertProfile(supabase, { learningPlanCreated: true });
    return null;
  }

  const language = profile?.learn_language || DEFAULT_LEARN_LANGUAGE;
  const dailyMinutes =
    profile?.daily_study_minutes ??
    lesson.duration_minutes ??
    lesson.durationMinutes ??
    DEFAULT_DAILY_MINUTES;
  const now = new Date().toISOString();

  const planData = {
    user_id: user.id,
    language,
    native_language: profile?.native_language || profile?.native_language_code,
    goal: profile?.learning_goal || 'conversation',
    focus: profile?.learning_focus || 'confidence',
    level: profile?.level_language || '1',
    daily_minutes: dailyMinutes,
    current_lesson_id: lesson.id,
    status: 'active',
    updated_at: now,
    metadata: {
      source: 'web-onboarding',
      generated_at: now,
    },
  };

  const { data, error } = await supabase
    .from('user_learning_plans')
    .upsert(planData, { onConflict: 'user_id,language' })
    .select()
    .limit(1);
  if (error) throw error;

  const plan = first(asArray<UserLearningPlan>(data));
  let items: UserLearningPlanItem[] = [];
  if (plan) {
    items = await getLearningPlanItems(supabase, plan.id);
    if (items.length === 0) {
      items = await createLearningPlanItems(supabase, plan.id, lessons);
    }
  }

  const progress = await startLessonProgress(supabase, lesson.id, plan?.id);
  const lessonI18n = await getLessonI18n(supabase, lesson.id, profile);
  await upsertProfile(supabase, { learningPlanCreated: true });

  return {
    plan,
    lesson,
    progress,
    items,
    lessonI18n,
  } satisfies ActiveLearningPlan;
}

export async function getActiveLearningPlan(
  supabase: Client
): Promise<ActiveLearningPlan> {
  const user = await requireUser(supabase);
  const profile = await getProfile(supabase);
  const language = profile?.learn_language || DEFAULT_LEARN_LANGUAGE;
  const { data, error } = await supabase
    .from('user_learning_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('language', language)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;

  const plan = first(asArray<UserLearningPlan>(data));
  if (!plan) {
    const created = await createOrUpdateLearningPlan(supabase);
    if (created) return created;
    const fallbackLesson =
      (await getRecommendedLessons(supabase, profile, 1))[0] ?? null;
    return {
      plan: null,
      lesson: fallbackLesson,
      progress: null,
      items: [],
      lessonI18n: fallbackLesson
        ? await getLessonI18n(supabase, fallbackLesson.id, profile)
        : null,
    };
  }

  const lesson = plan.current_lesson_id
    ? await getLessonById(supabase, plan.current_lesson_id)
    : ((await getRecommendedLessons(supabase, profile, 1))[0] ?? null);
  let items = await getLearningPlanItems(supabase, plan.id);
  if (items.length === 0) {
    const lessons = await getRecommendedLessons(supabase, profile, 20);
    items = await createLearningPlanItems(supabase, plan.id, lessons);
  }

  return {
    plan,
    lesson,
    progress: lesson ? await getLessonProgress(supabase, lesson.id) : null,
    items,
    lessonI18n: lesson
      ? await getLessonI18n(supabase, lesson.id, profile)
      : null,
  };
}

export async function getCollectList(
  supabase: Client,
  language?: string | null
) {
  const user = await requireUser(supabase);
  let query = supabase
    .from('collect')
    .select('*, word:content_id(*)')
    .eq('status', 1);
  if (language) query = query.eq('language', language);
  query = query.or(`user_id.eq.${user.id},user_id.is.null`);
  const { data, error } = await query;
  if (error) throw error;
  return asArray<AitalkCollect>(data);
}

export async function getStatistics(supabase: Client) {
  const user = await requireUser(supabase);
  const [{ data: today }, { data: total }, { count }] = await Promise.all([
    supabase.rpc('get_today_times', { userid: user.id }),
    supabase.rpc('get_total_times', { userid: user.id }),
    supabase
      .from('statistics')
      .select('date', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  return {
    todayTime: String(today ?? '0'),
    totalTime: String(total ?? '0'),
    dayCount: String(count ?? 0),
  };
}

export async function getUsage(supabase: Client) {
  const { data, error } = await supabase.functions.invoke('get-usage');
  if (error) throw error;
  return asArray<AitalkUsage>(data);
}

export async function invokeCourseTutorAgent(
  supabase: Client,
  body: Record<string, any>
) {
  const agentUrl =
    process.env.COURSE_TUTOR_AGENT_URL ||
    process.env.NEXT_PUBLIC_COURSE_TUTOR_AGENT_URL ||
    'https://agent.aitalk.im/course-tutor-agent';
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token && agentUrl) {
    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const responseText = await response.text();
    const responseData = responseText ? parseJsonOrText(responseText) : null;

    if (response.ok) {
      return responseData;
    }
  }

  const { data, error } = await supabase.functions.invoke(
    'course-tutor-agent',
    {
      body,
    }
  );
  if (error) throw error;
  if (typeof data === 'string' && data) {
    return parseJsonOrText(data);
  }
  return data;
}

function parseJsonOrText(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return { text: value };
  }
}

export async function getTextSpeech(
  supabase: Client,
  body: Record<string, any>
) {
  const { data, error } = await supabase.functions.invoke('text-speech', {
    body,
  });
  if (error) throw error;
  return data;
}
