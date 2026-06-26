export type JsonRecord = Record<string, any>;

export interface AitalkProfile {
  id?: number;
  user_id: string;
  native_language?: string | null;
  native_language_code?: string | null;
  learn_language?: string | null;
  learn_language_code?: string | null;
  level_language?: string | null;
  nick_name?: string | null;
  country?: string | null;
  learning_goal?: string | null;
  learning_focus?: string | null;
  daily_study_minutes?: number | null;
  learning_plan_created?: boolean | null;
  onboarding_completed_at?: string | null;
  avatar?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AitalkLanguage {
  id?: number;
  language_name: string;
  language_code: string;
  native_name: string;
  sort?: number | null;
}

export interface AitalkTeacher {
  id: number;
  name: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  nationality?: string | null;
  voice_name?: string | null;
  voiceName?: string | null;
  lang_region?: string | null;
  langRegion?: string | null;
  style?: string | null;
  language?: string | null;
  sex?: string | number | null;
  index?: number | null;
}

export interface TopicExercise {
  id: number;
  title?: string | null;
  name?: string | null;
  sub_title?: string | null;
  subTitle?: string | null;
  desc?: string | null;
  description?: string | null;
  content?: string | null;
  continue_desc?: string | null;
  continueDesc?: string | null;
  tip_native?: string | null;
  tipNative?: string | null;
  tip_learn?: string | null;
  tipLearn?: string | null;
  learn_words?: string | null;
  learnWords?: string | null;
  learn_sentences?: string | null;
  learnSentences?: string | null;
  native_language?: string | null;
  status?: number | null;
}

export interface LessonListDetail {
  id: number;
  lesson_name?: string | null;
  lesson_subtitle?: string | null;
  lesson_img?: string | null;
  lesson_words?: string | null;
  lesson_sentence?: string | null;
  unit_id?: number | null;
  unit_name?: string | null;
  unit_subtitle?: string | null;
  unit_icon?: string | null;
  difficulty?: string | null;
  lesson_key?: string | null;
  unit_key?: string | null;
  content_version?: string | null;
  title?: string | null;
  name?: string | null;
  subtitle?: string | null;
  description?: string | null;
  content?: string | null;
  language?: string | null;
  native_language?: string | null;
  level_id?: number | null;
  levelId?: number | null;
  goal_type?: string | null;
  goalType?: string | null;
  focus_type?: string | null;
  focusType?: string | null;
  duration_minutes?: number | null;
  durationMinutes?: number | null;
  sort_order?: number | null;
  sortOrder?: number | null;
  unit_title?: string | null;
  unitTitle?: string | null;
  status?: number | null;
  metadata?: JsonRecord | null;
}

export interface CourseLessonI18n {
  id: number;
  lesson_id: number;
  native_language?: string | null;
  title?: string | null;
  subtitle?: string | null;
  unit_name?: string | null;
  unit_subtitle?: string | null;
  words_translation?: string | null;
  sentence_translation?: string | null;
  explanation?: string | null;
  description?: string | null;
  content?: JsonRecord | string | null;
}

export interface CourseLessonStep {
  id: number;
  lesson_id: number;
  step_order?: number | null;
  step_type?: string | null;
  instruction?: string | null;
  scoring_rubric?: JsonRecord | string | null;
  type?: string | null;
  title?: string | null;
  content?: JsonRecord | string | null;
  prompt?: string | null;
  example?: string | null;
  status?: number | null;
}

export interface CourseLessonStepI18n {
  id: number;
  step_id: number;
  native_language?: string | null;
  title?: string | null;
  instruction?: string | null;
  content?: JsonRecord | string | null;
  prompt?: string | null;
  example?: string | null;
}

export type CourseStepContent = {
  outcome?: string;
  scenario?: string;
  success_criteria?: string[];
  listen_text?: string[];
  target_chunks?: string[];
  sentence_patterns?: string[];
  ai_role?: string;
  user_goal?: string;
  required_turns?: number;
  [key: string]: unknown;
};

export interface UserLearningPlan {
  id: number;
  user_id: string;
  language: string;
  native_language?: string | null;
  goal?: string | null;
  focus?: string | null;
  level?: string | null;
  daily_minutes?: number | null;
  current_lesson_id?: number | null;
  status?: string | null;
  metadata?: JsonRecord | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserLearningPlanItem {
  id: number;
  plan_id: number;
  user_id: string;
  lesson_id: number;
  plan_order: number;
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  lesson_list_detail?: LessonListDetail | null;
}

export interface UserLessonProgress {
  id?: number;
  user_id: string;
  lesson_id: number;
  plan_id?: number | null;
  status?: string | null;
  progress_percent?: number | null;
  best_score?: number | null;
  attempts_count?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_practiced_at?: string | null;
  updated_at?: string | null;
}

export type TutorCriteriaStatusValue = 'pending' | 'met' | 'missed';

export interface TutorCriteriaStatus {
  label: string;
  status: TutorCriteriaStatusValue;
  evidence?: string | null;
}

export interface TutorImprovedSentence {
  original?: string | null;
  improved: string;
  reason?: string | null;
}

export interface TutorPracticeReport {
  score: number;
  criteria_status: TutorCriteriaStatus[];
  target_chunks_used: string[];
  feedback_summary?: string | null;
  weak_points: string[];
  review_items: string[];
  improved_sentence?: TutorImprovedSentence | null;
}

export interface LessonAttempt {
  id: number;
  created_at?: string | null;
  user_id: string;
  lesson_id: number;
  step_id?: number | null;
  plan_id?: number | null;
  practice_type: string;
  transcript?: string | null;
  audio_url?: string | null;
  duration_seconds?: number | null;
  scores?: JsonRecord | null;
  feedback?: TutorPracticeReport | JsonRecord | null;
  metadata?: JsonRecord | null;
}

export interface ActiveLearningPlan {
  plan: UserLearningPlan | null;
  lesson: LessonListDetail | null;
  progress: UserLessonProgress | null;
  items: UserLearningPlanItem[];
  lessonI18n: CourseLessonI18n | null;
}

export interface AitalkCollect {
  id: number;
  user_id?: string | null;
  content_id?: number | null;
  status?: number | null;
  type?: string | null;
  language?: string | null;
  word?: JsonRecord | null;
}

export interface AitalkUsage {
  vipStatus?: string;
  vip_status?: string;
  [key: string]: any;
}

export interface OnboardingInput {
  nativeLanguage: string;
  nativeLanguageCode: string;
  learnLanguage: string;
  learnLanguageCode: string;
  levelLanguage: string;
  learningGoal: string;
  learningFocus: string;
  dailyStudyMinutes: number;
  nickName: string;
}

export interface PracticeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type PracticeMode = 'guided' | 'review' | 'free' | 'topic';

export interface LessonPracticeConfig {
  requiredTurns: number;
  successCriteria: string[];
}
