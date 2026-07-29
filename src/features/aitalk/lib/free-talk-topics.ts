import type { FreeTalkTopic } from '../types';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
const TOPIC_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const FREE_TALK_TOPICS = [
  {
    key: 'daily-life',
    title: 'Daily life',
    description: 'Turn everyday moments into easy, useful speaking practice.',
    openingPrompt: 'What has your day been like so far?',
    context: 'Discuss routines, small moments, plans, and everyday choices.',
    emoji: '☀️',
    recommendedLevel: 'L1–L2',
    minutes: 8,
  },
  {
    key: 'travel',
    title: 'Travel',
    description: 'Plan a trip, share a memory, or solve a travel problem.',
    openingPrompt: 'Where would you like to travel next, and why?',
    context:
      'Discuss destinations, transport, accommodation, memories, and travel preferences.',
    emoji: '✈️',
    recommendedLevel: 'L2–L4',
    minutes: 12,
  },
  {
    key: 'food',
    title: 'Food',
    description: 'Talk about flavors, meals, cooking, and favorite places.',
    openingPrompt: 'What is a meal you never get tired of?',
    context:
      'Discuss food preferences, cooking, restaurants, traditions, and memorable meals.',
    emoji: '🍜',
    recommendedLevel: 'L1–L3',
    minutes: 8,
  },
  {
    key: 'hobbies',
    title: 'Hobbies',
    description: 'Share what you enjoy and what you want to try next.',
    openingPrompt: 'What do you enjoy doing when you have free time?',
    context:
      'Discuss hobbies, skills, creative interests, sports, and ways to spend free time.',
    emoji: '🎨',
    recommendedLevel: 'L1–L3',
    minutes: 10,
  },
  {
    key: 'study',
    title: 'Study',
    description: 'Reflect on learning habits, goals, and useful strategies.',
    openingPrompt: 'What are you learning right now?',
    context:
      'Discuss learning goals, study habits, challenges, teachers, and useful strategies.',
    emoji: '📚',
    recommendedLevel: 'L2–L4',
    minutes: 10,
  },
  {
    key: 'work',
    title: 'Work',
    description: 'Practice talking about projects, teamwork, and career goals.',
    openingPrompt: 'What part of your work or ideal job interests you most?',
    context:
      'Discuss work, projects, teamwork, professional challenges, and career plans.',
    emoji: '💼',
    recommendedLevel: 'L3–L5',
    minutes: 12,
  },
  {
    key: 'culture',
    title: 'Culture',
    description: 'Compare traditions, media, language, and social customs.',
    openingPrompt: 'What tradition from your culture would you like to share?',
    context:
      'Discuss traditions, celebrations, media, language, values, and cultural differences.',
    emoji: '🌏',
    recommendedLevel: 'L3–L5',
    minutes: 12,
  },
  {
    key: 'dreams',
    title: 'Dreams & goals',
    description: 'Imagine the future and explain what matters to you.',
    openingPrompt: 'What is one goal you would love to achieve?',
    context:
      'Discuss ambitions, future plans, personal values, motivation, and imagined possibilities.',
    emoji: '✨',
    recommendedLevel: 'L2–L5',
    minutes: 10,
  },
] as const satisfies readonly FreeTalkTopic[];

export function sanitizeTopicText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeTopicKey(value: unknown) {
  const key = sanitizeTopicText(value, 48).toLowerCase();
  return key && TOPIC_KEY.test(key) ? key : '';
}

export function getFreeTalkTopic(value: unknown): FreeTalkTopic | null {
  const key = normalizeTopicKey(value);
  return FREE_TALK_TOPICS.find((topic) => topic.key === key) ?? null;
}

export function parsePracticeQuery(input: {
  lesson?: string;
  mode?: string;
  topic?: string;
  topicKey?: string;
}) {
  const lessonId =
    input.lesson && /^\d+$/.test(input.lesson)
      ? Number.parseInt(input.lesson, 10)
      : null;
  const topicId =
    input.topic && /^\d+$/.test(input.topic)
      ? Number.parseInt(input.topic, 10)
      : null;
  const topicKey = normalizeTopicKey(input.topicKey) || null;

  return {
    lessonId:
      lessonId && Number.isSafeInteger(lessonId) && lessonId > 0
        ? lessonId
        : null,
    mode: input.mode === 'free' ? 'free' : null,
    topicId:
      topicId && Number.isSafeInteger(topicId) && topicId > 0 ? topicId : null,
    topicKey,
  };
}
