export const AITALK_APP_HOME = '/app';
export const AITALK_LOGIN_PATH = '/login';
export const AITALK_ONBOARDING_PATH = '/onboarding';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://jkdhpfscpoahowolprco.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJqa2RocGZzY3BvYWhvd29scHJjbyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjg4MzQxNzU0LCJleHAiOjIwMDM5MTc3NTR9.cMmgh_NJX4A5TT7i33FHufTn1UKao8tIM9HaREDnK-o';

export const DEFAULT_LEARN_LANGUAGE = 'English';
export const DEFAULT_NATIVE_LANGUAGE = 'English';
export const DEFAULT_DAILY_MINUTES = 10;

export const ONBOARDING_GOALS = [
  {
    value: 'travel',
    label: 'Travel',
    description: 'Ask directions, check in, order food',
  },
  {
    value: 'career',
    label: 'Career',
    description: 'Meetings, interviews, workplace chats',
  },
  {
    value: 'conversation',
    label: 'Daily conversation',
    description: 'Talk naturally in everyday situations',
  },
  {
    value: 'exam',
    label: 'Study or exams',
    description: 'Build speaking accuracy and fluency',
  },
  {
    value: 'interest',
    label: 'Personal interest',
    description: 'Keep learning fun and consistent',
  },
  {
    value: 'social',
    label: 'Meet people',
    description: 'Make friends and handle small talk',
  },
];

export const ONBOARDING_FOCUS = [
  {
    value: 'confidence',
    label: 'Speak with confidence',
    description: 'Stop freezing during real conversations',
  },
  {
    value: 'listening',
    label: 'Improve listening',
    description: 'Understand natural speech faster',
  },
  {
    value: 'pronunciation',
    label: 'Better pronunciation',
    description: 'Sound clearer and more natural',
  },
  {
    value: 'vocabulary',
    label: 'Useful vocabulary',
    description: 'Use practical words in real contexts',
  },
  {
    value: 'real_conversation',
    label: 'Real conversations',
    description: 'Practice complete scenarios with AI',
  },
  {
    value: 'grammar',
    label: 'Grammar in speaking',
    description: 'Say things correctly without overthinking',
  },
];

export const LEVEL_OPTIONS = [
  { value: '1', label: 'Beginner', description: 'I am a beginner' },
  {
    value: '2',
    label: 'Elementary',
    description: 'I know some vocabulary and phrases',
  },
  {
    value: '3',
    label: 'Basic conversation',
    description: 'I can have some basic conversations',
  },
  {
    value: '4',
    label: 'Intermediate',
    description: 'I belong to the intermediate level',
  },
  { value: '5', label: 'Advanced', description: 'I am an advanced learner' },
];

export const DAILY_MINUTE_OPTIONS = [
  { value: 5, label: '5 minutes / day', description: 'Easy start' },
  { value: 10, label: '10 minutes / day', description: 'Steady progress' },
  { value: 15, label: '15 minutes / day', description: 'Focused practice' },
  { value: 20, label: '20 minutes / day', description: 'Faster improvement' },
];

export const FLAG_BY_LANGUAGE: Record<string, string> = {
  English: 'US',
  Chinese: 'CN',
  Cantonese: 'CN',
  Japanese: 'JP',
  Korean: 'KR',
  French: 'FR',
  German: 'DE',
  Italian: 'IT',
  Spanish: 'ES',
  Vietnamese: 'VN',
  Portuguese: 'PT',
};
