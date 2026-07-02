'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  askTutorAction,
  completeLessonFromPracticeAction,
} from '@/features/aitalk/actions';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/features/aitalk/constants';
import {
  DEFAULT_AITALK_SPEECH_STYLE,
  normalizeAitalkSpeechLang,
  prepareAitalkSpeechText,
  resolveAitalkVoiceName,
} from '@/features/aitalk/lib/tts';
import { createAitalkBrowserClient } from '@/features/aitalk/supabase/browser';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Keyboard,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

import {
  buildTopicTutorPrompt,
  displayLessonTitle,
  displayTopicPrompt,
  displayTopicTitle,
} from '../data';
import type {
  LessonListDetail,
  PracticeMessage,
  PracticeMode,
  TopicExercise,
  TutorCriteriaStatus,
  TutorImprovedSentence,
  TutorPracticeReport,
} from '../types';

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const TTS_CACHE_DB = 'aitalk-tts-cache-v1';
const TTS_CACHE_STORE = 'audio';

const TOPIC_SUCCESS_CRITERIA = [
  'Stay on the selected speaking topic.',
  'Answer the teacher naturally in the target language.',
  'Ask or answer at least one relevant follow-up question about the topic.',
  'Do not switch to unrelated self-introduction practice unless the topic asks for it.',
];

type SpeechInput = {
  lang: string;
  name: string;
  rate: string;
  style: string;
  text: string;
};

type SpeakOptions = {
  interrupt?: boolean;
  suppressError?: boolean;
};

type SpeakingPhase = 'loading' | 'playing';
type RecordingStatus = 'idle' | 'recording' | 'transcribing';
type MobileInputMode = 'voice' | 'text';

type TutorRaw = {
  raw?: unknown;
  data?: unknown;
  response?: unknown;
  task_passed?: unknown;
  taskPassed?: unknown;
  should_complete_lesson?: unknown;
  shouldCompleteLesson?: unknown;
  [key: string]: unknown;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

function buildTopicTeacherHintInstruction(
  learnLanguage: string,
  nativeLanguage: string
) {
  return [
    'TEACHER_HINT_MODE:',
    'Act as both a realistic conversation partner and a speaking teacher.',
    `The selected topic is the only speaking scenario. Keep the conversation on this topic unless the learner clearly changes it.`,
    `In every assistant turn, first respond naturally to the learner previous message in ${learnLanguage}.`,
    `Then continue the roleplay in ${learnLanguage} with exactly one clear follow-up question or one sentence opening that helps the learner keep speaking about the selected topic.`,
    'Do not ignore the learner previous sentence or jump to an unrelated topic.',
    `Then add a brief coach hint in ${nativeLanguage} using the label "Hint:".`,
    `Under "You can say:", give one short sample reply in ${learnLanguage}.`,
    'Keep the hint short and beginner-friendly. Do not translate the whole conversation.',
    'Do not complete the task for the user; give sentence starters or reply options that help the user answer.',
    'If the user makes a mistake, briefly correct it in the coach hint and give one improved phrase.',
    'Always leave one clear question or opening for the user to answer next.',
  ].join(' ');
}

function parseTutorBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

function readTutorBoolean(value: unknown, keys: string[]): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as TutorRaw;

  for (const key of keys) {
    if (key in record && parseTutorBoolean(record[key])) return true;
  }

  return [record.raw, record.data, record.response].some((nested) =>
    readTutorBoolean(nested, keys)
  );
}

function isTutorCompletion(raw: unknown) {
  return (
    readTutorBoolean(raw, ['task_passed', 'taskPassed']) &&
    readTutorBoolean(raw, ['should_complete_lesson', 'shouldCompleteLesson'])
  );
}

function readTutorValue(value: unknown, keys: string[]): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as TutorRaw;

  for (const key of keys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  for (const nested of [record.raw, record.data, record.response]) {
    const nestedValue = readTutorValue(nested, keys);
    if (nestedValue !== undefined) return nestedValue;
  }

  return undefined;
}

function readTutorString(raw: unknown, keys: string[]) {
  const value = readTutorValue(raw, keys);
  return typeof value === 'string' ? value.trim() : '';
}

function readTutorNumber(raw: unknown, keys: string[]) {
  const value = readTutorValue(raw, keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readTutorStringList(raw: unknown, keys: string[]) {
  const value = readTutorValue(raw, keys);
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function buildPendingCriteria(criteria: string[]): TutorCriteriaStatus[] {
  return criteria.map((label) => ({
    label,
    status: 'pending',
  }));
}

function normalizeCriteriaStatusValue(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (
    status === 'met' ||
    status === 'done' ||
    status === 'pass' ||
    status === 'passed' ||
    status === 'complete' ||
    status === 'completed'
  ) {
    return 'met' as const;
  }
  if (
    status === 'missed' ||
    status === 'fail' ||
    status === 'failed' ||
    status === 'needs_work'
  ) {
    return 'missed' as const;
  }
  return 'pending' as const;
}

function parseCriteriaStatusList(value: unknown): TutorCriteriaStatus[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const label = String(record.label || record.criteria || '').trim();
      if (!label) return null;
      return {
        label,
        status: normalizeCriteriaStatusValue(record.status),
        evidence:
          typeof record.evidence === 'string' ? record.evidence.trim() : null,
      } satisfies TutorCriteriaStatus;
    })
    .filter(Boolean) as TutorCriteriaStatus[];
}

function mergeCriteriaStatuses(
  current: TutorCriteriaStatus[],
  next: TutorCriteriaStatus[],
  fallbackCriteria: string[]
) {
  const base = current.length
    ? [...current]
    : buildPendingCriteria(fallbackCriteria);
  const indexByLabel = new Map(
    base.map((item, index) => [item.label.toLowerCase(), index])
  );

  for (const item of next) {
    const key = item.label.toLowerCase();
    const index = indexByLabel.get(key);
    if (index === undefined) {
      indexByLabel.set(key, base.length);
      base.push(item);
      continue;
    }
    base[index] = {
      ...base[index],
      ...item,
      status:
        item.status === 'pending' && base[index].status === 'met'
          ? 'met'
          : item.status,
    };
  }

  return base;
}

function readCriteriaStatusFromTutor(
  raw: unknown,
  fallbackCriteria: string[],
  markAllMet = false
) {
  const rawList = parseCriteriaStatusList(
    readTutorValue(raw, ['criteria_status', 'criteriaStatus'])
  );
  const fallback = fallbackCriteria.map((label) => ({
    label,
    status: markAllMet ? ('met' as const) : ('pending' as const),
  }));
  if (rawList.length === 0) return fallback;
  return mergeCriteriaStatuses(fallback, rawList, fallbackCriteria);
}

function readImprovedSentence(raw: unknown): TutorImprovedSentence | null {
  const value = readTutorValue(raw, ['improved_sentence', 'improvedSentence']);
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const improved =
    typeof record.improved === 'string' ? record.improved.trim() : '';
  if (!improved) return null;
  return {
    original:
      typeof record.original === 'string' ? record.original.trim() : null,
    improved,
    reason: typeof record.reason === 'string' ? record.reason.trim() : null,
  };
}

function buildPracticeReport(
  raw: unknown,
  criteriaStatus: TutorCriteriaStatus[],
  completed: boolean
): TutorPracticeReport {
  const score = Math.round(
    Math.min(
      100,
      Math.max(0, readTutorNumber(raw, ['score']) ?? (completed ? 82 : 0))
    )
  );
  const feedbackSummary =
    readTutorString(raw, ['feedback_summary', 'feedbackSummary']) ||
    (completed
      ? 'You completed the roleplay target. Review the weak points, then move to the next lesson.'
      : 'Keep practicing the checklist items before completing this lesson.');

  return {
    score,
    criteria_status: criteriaStatus,
    target_chunks_used: readTutorStringList(raw, [
      'target_chunks_used',
      'targetChunksUsed',
    ]),
    feedback_summary: feedbackSummary,
    weak_points: readTutorStringList(raw, ['weak_points', 'weakPoints']).slice(
      0,
      4
    ),
    review_items: readTutorStringList(raw, [
      'review_items',
      'reviewItems',
    ]).slice(0, 5),
    improved_sentence: readImprovedSentence(raw),
  };
}

function criteriaProgress(criteriaStatus: TutorCriteriaStatus[]) {
  return criteriaStatus.filter((item) => item.status === 'met').length;
}

function isPracticeMessage(value: unknown): value is PracticeMessage {
  if (!value || typeof value !== 'object') return false;
  const record = value as PracticeMessage;
  return (
    (record.role === 'assistant' ||
      record.role === 'user' ||
      record.role === 'system') &&
    typeof record.content === 'string'
  );
}

function loadStoredMessages(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isPracticeMessage);
  } catch {
    return null;
  }
}

function saveStoredMessages(key: string, messages: PracticeMessage[]) {
  try {
    if (messages.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(messages));
  } catch {
    // Storage can be unavailable in private browsing; practice still works.
  }
}

function buildLessonTutorTopic(
  title: string,
  practiceMode: PracticeMode,
  lesson: LessonListDetail | null
) {
  const context = [
    `Target-language lesson: ${title}`,
    lesson?.lesson_subtitle || lesson?.subtitle
      ? `Lesson goal: ${lesson.lesson_subtitle || lesson.subtitle}`
      : '',
    lesson?.lesson_words ? `Target chunks: ${lesson.lesson_words}` : '',
    lesson?.lesson_sentence
      ? `Sample sentences: ${lesson.lesson_sentence}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (practiceMode === 'review') {
    return [
      context || title,
      'This is a completed lesson review. Revisit the same goal, keep the structure guided, and do not mark the lesson complete again.',
    ].join('\n\n');
  }

  if (practiceMode === 'free') {
    return [
      context || title,
      'The learner already completed this lesson. Use the lesson as context, but keep the conversation open-ended and natural.',
    ].join('\n\n');
  }

  return context || title;
}

function resolveLessonMode(practiceMode: PracticeMode) {
  if (practiceMode === 'topic') return 'free_practice';
  if (practiceMode === 'free') return 'free_practice_after_complete';
  return 'guided_practice';
}

function getModeLabel(practiceMode: PracticeMode) {
  if (practiceMode === 'topic') return 'Topic practice';
  if (practiceMode === 'review') return 'Review';
  if (practiceMode === 'free') return 'Free talk';
  return 'Guided lesson';
}

function getModeDescription(practiceMode: PracticeMode) {
  if (practiceMode === 'topic') {
    return 'Stay on the selected topic and answer naturally with your tutor.';
  }
  if (practiceMode === 'review') {
    return 'Review this completed lesson with a guided conversation.';
  }
  if (practiceMode === 'free') {
    return 'Continue with an open conversation based on this lesson.';
  }
  return 'Follow the lesson goal. Your tutor will lead and complete it when you meet the target.';
}

function openTtsCache() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(TTS_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(TTS_CACHE_STORE);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getCachedAudio(key: string) {
  if (!('indexedDB' in window)) return null;
  const db = await openTtsCache();
  return new Promise<Blob | null>((resolve, reject) => {
    const request = db
      .transaction(TTS_CACHE_STORE, 'readonly')
      .objectStore(TTS_CACHE_STORE)
      .get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve((request.result as Blob | undefined) ?? null);
  }).finally(() => db.close());
}

async function setCachedAudio(key: string, value: Blob) {
  if (!('indexedDB' in window)) return;
  const db = await openTtsCache();
  await new Promise<void>((resolve, reject) => {
    const request = db
      .transaction(TTS_CACHE_STORE, 'readwrite')
      .objectStore(TTS_CACHE_STORE)
      .put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  }).finally(() => db.close());
}

async function digestCacheKey(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function parseTranscriptResponse(response: Response) {
  const data = await response.json().catch(() => null);
  return {
    text: typeof data?.text === 'string' ? data.text.trim() : '',
    raw: data,
  };
}

function buildSpeechTranscriptFormData({
  audioBlob,
  language,
  prompt,
}: {
  audioBlob: Blob;
  language: string;
  prompt: string;
}) {
  const formData = new FormData();
  formData.set(
    'file',
    audioBlob,
    audioBlob.type.includes('mp4') ? 'speech.mp4' : 'speech.webm'
  );
  if (language) formData.set('language', language);
  if (prompt) formData.set('prompt', prompt);
  return formData;
}

export function PracticeClient({
  learnLanguage,
  lesson,
  locale,
  nativeLanguage,
  nextLessonId,
  planId,
  practiceMode,
  progressStatus,
  requiredTurns,
  speechLocale,
  speechStyle,
  successCriteria,
  teacherName,
  topic,
  userId,
  voiceName,
}: {
  learnLanguage: string;
  lesson: LessonListDetail | null;
  locale: string;
  nativeLanguage: string;
  nextLessonId?: number;
  planId?: number;
  practiceMode: PracticeMode;
  progressStatus?: string;
  requiredTurns: number;
  speechLocale: string;
  speechStyle?: string;
  successCriteria: string[];
  teacherName?: string;
  topic?: TopicExercise | null;
  userId?: string;
  voiceName?: string;
}) {
  const activeTopic = topic ?? null;
  const activePracticeMode = activeTopic ? 'topic' : practiceMode;
  const topicInitialPrompt = useMemo(
    () => displayTopicPrompt(activeTopic),
    [activeTopic]
  );
  const [messages, setMessages] = useState<PracticeMessage[]>(() =>
    activeTopic
      ? [
          {
            role: 'assistant',
            content: topicInitialPrompt,
          },
        ]
      : []
  );
  const [text, setText] = useState('');
  const [mobileInputMode, setMobileInputMode] =
    useState<MobileInputMode>('voice');
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>('idle');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState('');
  const [autoStarting, setAutoStarting] = useState(false);
  const [pending, setPending] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(
    progressStatus === 'completed' || activePracticeMode !== 'guided'
  );
  const [lessonCompletedInSession, setLessonCompletedInSession] =
    useState(false);
  const [criteriaStatus, setCriteriaStatus] = useState<TutorCriteriaStatus[]>(
    () =>
      activePracticeMode === 'guided'
        ? buildPendingCriteria(successCriteria)
        : []
  );
  const [practiceReport, setPracticeReport] =
    useState<TutorPracticeReport | null>(null);
  const [hydratedScope, setHydratedScope] = useState('');
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<
    number | null
  >(null);
  const [speakingPhase, setSpeakingPhase] = useState<SpeakingPhase>('loading');
  const supabase = useMemo(() => createAitalkBrowserClient(), []);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef('');
  const audioUnlockedRef = useRef(false);
  const speechRunIdRef = useRef(0);
  const autoStartScopeRef = useRef('');

  const title = useMemo(
    () =>
      activeTopic ? displayTopicTitle(activeTopic) : displayLessonTitle(lesson),
    [activeTopic, lesson]
  );
  const storageKey = useMemo(() => {
    if (!userId || !lesson || activePracticeMode === 'topic') return '';
    return `aitalk.practice.${userId}.lesson.${lesson.id}.${activePracticeMode}`;
  }, [activePracticeMode, lesson, userId]);
  const practiceScope = useMemo(() => {
    if (activeTopic) return `topic.${activeTopic.id}`;
    return [
      'lesson',
      lesson?.id ?? 'none',
      activePracticeMode,
      userId ?? 'anonymous',
    ].join('.');
  }, [activePracticeMode, activeTopic, lesson?.id, userId]);
  const isLessonPractice = Boolean(lesson && activePracticeMode !== 'topic');
  const modeLabel = getModeLabel(activePracticeMode);
  const modeDescription = getModeDescription(activePracticeMode);
  const tutorTopic = useMemo(() => {
    if (!activeTopic) {
      return buildLessonTutorTopic(title, activePracticeMode, lesson);
    }
    return [
      buildTopicTutorPrompt(activeTopic),
      buildTopicTeacherHintInstruction(learnLanguage, nativeLanguage),
    ]
      .filter(Boolean)
      .join('\n\n');
  }, [
    activePracticeMode,
    activeTopic,
    learnLanguage,
    lesson,
    nativeLanguage,
    title,
  ]);

  useEffect(() => {
    setText('');
    setError('');
    setLessonCompleted(
      progressStatus === 'completed' || activePracticeMode !== 'guided'
    );
    setLessonCompletedInSession(false);
    setCriteriaStatus(
      activePracticeMode === 'guided'
        ? buildPendingCriteria(successCriteria)
        : []
    );
    setPracticeReport(null);
    autoStartScopeRef.current = '';

    if (activeTopic) {
      setMessages([
        {
          role: 'assistant',
          content: topicInitialPrompt,
        },
      ]);
      setHydratedScope(practiceScope);
      return;
    }

    const storedMessages = storageKey ? loadStoredMessages(storageKey) : null;
    setMessages(storedMessages?.length ? storedMessages : []);
    setHydratedScope(practiceScope);
  }, [
    activePracticeMode,
    practiceScope,
    progressStatus,
    storageKey,
    activeTopic,
    topicInitialPrompt,
    successCriteria,
  ]);

  useEffect(() => {
    if (!storageKey || hydratedScope !== practiceScope) return;
    saveStoredMessages(storageKey, messages);
  }, [hydratedScope, messages, practiceScope, storageKey]);

  useEffect(() => {
    setSpeechSupported(
      typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== 'undefined'
    );
  }, []);

  useEffect(() => {
    if (!speechSupported) {
      setMobileInputMode('text');
    }
  }, [speechSupported]);

  useEffect(() => {
    if (!isLessonPractice) return;
    if (hydratedScope !== practiceScope) return;
    if (messages.length > 0) return;
    if (autoStartScopeRef.current === practiceScope) return;

    autoStartScopeRef.current = practiceScope;
    let cancelled = false;
    setAutoStarting(true);
    setError('');

    askTutorAction({
      autoSend: true,
      chatTopic: tutorTopic,
      learnLanguage,
      lessonCompleted: activePracticeMode !== 'guided',
      lessonId: lesson?.id,
      lessonMode: resolveLessonMode(activePracticeMode),
      nativeLanguage,
      planId: activePracticeMode === 'guided' ? planId : undefined,
      requiredTurns,
      successCriteria,
      teacherName,
      text: '',
      locale,
      messages: [],
    })
      .then((result) => {
        if (cancelled) return;
        if ('error' in result && result.error) {
          setError(result.error);
          return;
        }

        const assistantReply =
          result.reply ||
          'Hi. Let us start this lesson. Answer in one clear sentence.';
        setMessages([
          {
            role: 'assistant',
            content: assistantReply,
          },
        ]);
        void speak(assistantReply, 0, {
          interrupt: true,
          suppressError: true,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setError(getErrorMessage(error) || 'Tutor could not start the lesson.');
      })
      .finally(() => {
        if (!cancelled) setAutoStarting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activePracticeMode,
    hydratedScope,
    isLessonPractice,
    learnLanguage,
    lesson?.id,
    locale,
    messages.length,
    nativeLanguage,
    planId,
    practiceScope,
    requiredTurns,
    successCriteria,
    teacherName,
    tutorTopic,
  ]);

  useEffect(() => {
    return () => {
      stopRecordingStream();
      stopCurrentSpeech();
    };
  }, []);

  async function startListening() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setSpeechSupported(false);
      return;
    }

    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      const mimeType = resolveRecordingMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setError('Recording failed. You can keep typing instead.');
        setRecordingStatus('idle');
        stopRecordingStream();
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        recordingChunksRef.current = [];
        stopRecordingStream();
        void transcribeAudio(audioBlob);
      };

      recorder.start();
      setRecordingStatus('recording');
    } catch (error) {
      setError(
        getErrorMessage(error) ||
          'Microphone permission was denied. You can keep typing instead.'
      );
      setRecordingStatus('idle');
      stopRecordingStream();
    }
  }

  function stopListening() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      stopRecordingStream();
      setRecordingStatus('idle');
      return;
    }
    setRecordingStatus('transcribing');
    recorder.stop();
  }

  function stopRecordingStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  function resolveRecordingMimeType() {
    const supportedTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
    ];
    return (
      supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ''
    );
  }

  function resolveSttLanguage() {
    const lang = normalizeAitalkSpeechLang(speechLocale);
    return lang.split('-')[0]?.toLowerCase() || '';
  }

  async function transcribeAudio(audioBlob: Blob) {
    if (audioBlob.size === 0) {
      setError('Recording is empty. Please try again.');
      setRecordingStatus('idle');
      return;
    }

    setRecordingStatus('transcribing');
    setError('');
    try {
      const result = await fetchSpeechTranscript(audioBlob);
      if (!result.text) {
        setError('No speech was detected. Please try again or type instead.');
        return;
      }
      setText((current) =>
        current.trim() ? `${current.trim()} ${result.text}` : result.text
      );
    } catch (error) {
      setError(getErrorMessage(error) || 'Speech transcription failed.');
    } finally {
      setRecordingStatus('idle');
    }
  }

  function revokeCurrentAudioUrl() {
    if (!audioUrlRef.current) return;
    URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = '';
  }

  function stopCurrentSpeech() {
    audioRef.current?.pause();
    audioRef.current = null;
    revokeCurrentAudioUrl();
  }

  function unlockAudioPlayback() {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;

    try {
      const audioWindow = window as AudioContextWindow;
      const AudioContextConstructor =
        audioWindow.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextConstructor) return;

      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.01);
      void audioContext.resume().finally(() => {
        window.setTimeout(() => {
          void audioContext.close().catch(() => undefined);
        }, 100);
      });
    } catch {
      audioUnlockedRef.current = false;
    }
  }

  async function speak(
    value: string,
    messageIndex: number,
    options: SpeakOptions = {}
  ) {
    const lang = normalizeAitalkSpeechLang(speechLocale);
    const nextText = prepareAitalkSpeechText(value, lang);
    if (!nextText) return;
    if (speakingMessageIndex !== null && !options.interrupt) return;

    const selectedVoiceName = resolveAitalkVoiceName(lang, voiceName);
    const selectedStyle = speechStyle || DEFAULT_AITALK_SPEECH_STYLE;
    const input: SpeechInput = {
      text: nextText,
      lang,
      name: selectedVoiceName,
      rate: 'default',
      style: selectedStyle,
    };
    const cacheKey = await digestCacheKey(
      JSON.stringify({
        text: nextText,
        lang,
        name: selectedVoiceName,
        style: selectedStyle,
        rate: input.rate,
      })
    );

    const speechRunId = speechRunIdRef.current + 1;
    speechRunIdRef.current = speechRunId;
    stopCurrentSpeech();
    setError('');
    setSpeakingPhase('loading');
    setSpeakingMessageIndex(messageIndex);

    const markPlaybackStarted = () => {
      if (speechRunIdRef.current !== speechRunId) return;
      setSpeakingPhase('playing');
    };

    try {
      await playCachedOrGeneratedSpeechAudio(
        input,
        cacheKey,
        markPlaybackStarted
      );
    } catch (error: any) {
      console.warn('aitalk_speech_playback_failed', error);
      const message = getErrorMessage(error) || 'Text-to-speech failed.';
      if (!options.suppressError) {
        setError(message);
      }
    } finally {
      if (speechRunIdRef.current === speechRunId) {
        setSpeakingMessageIndex(null);
        setSpeakingPhase('loading');
      }
    }
  }

  async function playCachedOrGeneratedSpeechAudio(
    input: SpeechInput,
    cacheKey: string,
    onPlaybackStart?: () => void
  ) {
    const cachedAudio = await getCachedAudio(cacheKey).catch(() => null);
    const audioBlob = cachedAudio || (await fetchSpeechAudio(input));
    if (!cachedAudio) {
      await setCachedAudio(cacheKey, audioBlob).catch(() => undefined);
    }

    await playAudioBlob(audioBlob, onPlaybackStart);
  }

  async function playAudioBlob(audioBlob: Blob, onPlaybackStart?: () => void) {
    revokeCurrentAudioUrl();

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioUrlRef.current = audioUrl;
    audioRef.current = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null;
        revokeCurrentAudioUrl();
        resolve();
      };
      audio.onerror = () => {
        if (audioRef.current === audio) audioRef.current = null;
        revokeCurrentAudioUrl();
        reject(new Error('Audio playback failed.'));
      };
      audio.onplaying = () => {
        onPlaybackStart?.();
      };
      audio.play().catch((error) => {
        if (audioRef.current === audio) audioRef.current = null;
        revokeCurrentAudioUrl();
        reject(error);
      });
    });
  }

  async function fetchSpeechAudio(input: SpeechInput) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const directResponse = await fetch(
        `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/text-speech`,
        {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg, application/octet-stream',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...input,
          }),
        }
      );

      if (directResponse.ok) {
        return directResponse.blob();
      }
    }

    const response = await fetch('/api/aitalk/text-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...input,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Text-to-speech failed.');
    }

    return response.blob();
  }

  async function fetchSpeechTranscript(audioBlob: Blob) {
    const language = resolveSttLanguage();
    const prompt = title ? `AITalk English speaking lesson: ${title}` : '';

    const response = await fetch('/api/aitalk/speech-to-text', {
      method: 'POST',
      body: buildSpeechTranscriptFormData({
        audioBlob,
        language,
        prompt,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Speech transcription failed.');
    }

    return parseTranscriptResponse(response);
  }

  function submit() {
    const nextText = text.trim();
    if (!nextText || pending || autoStarting || recordingStatus !== 'idle') {
      return;
    }
    unlockAudioPlayback();
    const nextMessages: PracticeMessage[] = [
      ...messages,
      { role: 'user', content: nextText },
    ];
    setMessages(nextMessages);
    setText('');
    setError('');

    setPending(true);
    void (async () => {
      const result = await askTutorAction({
        chatTopic: tutorTopic,
        learnLanguage,
        lessonCompleted:
          activePracticeMode !== 'guided' || Boolean(lessonCompleted),
        lessonId: activeTopic ? undefined : lesson?.id,
        lessonMode: resolveLessonMode(activePracticeMode),
        nativeLanguage,
        planId: activePracticeMode === 'guided' ? planId : undefined,
        requiredTurns: activeTopic ? 4 : requiredTurns,
        successCriteria: activeTopic ? TOPIC_SUCCESS_CRITERIA : successCriteria,
        teacherName,
        text: nextText,
        locale,
        messages: nextMessages,
      });

      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }

      const assistantReply =
        result.reply ||
        'Good. Try again with one more detail and clearer pronunciation.';
      const assistantIndex = nextMessages.length;
      const transcriptMessages: PracticeMessage[] = [
        ...nextMessages,
        {
          role: 'assistant',
          content: assistantReply,
        },
      ];
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: assistantReply,
        },
      ]);

      const tutorCompleted = Boolean(
        activePracticeMode === 'guided' &&
          lesson?.id &&
          !lessonCompleted &&
          isTutorCompletion(result.raw)
      );
      if (activePracticeMode === 'guided') {
        const nextCriteriaStatus = readCriteriaStatusFromTutor(
          result.raw,
          successCriteria,
          Boolean(tutorCompleted)
        );
        setCriteriaStatus((current) =>
          mergeCriteriaStatuses(current, nextCriteriaStatus, successCriteria)
        );
      }

      if (tutorCompleted && lesson?.id) {
        const finalCriteriaStatus = readCriteriaStatusFromTutor(
          result.raw,
          successCriteria,
          true
        );
        const report = buildPracticeReport(
          result.raw,
          finalCriteriaStatus,
          true
        );
        await completeLessonFromPracticeAction({
          lessonId: lesson.id,
          locale,
          planId,
          attempt: {
            transcript: JSON.stringify(transcriptMessages),
            scores: { overall: report.score },
            feedback: report,
            metadata: {
              lessonMode: resolveLessonMode(activePracticeMode),
              requiredTurns,
              successCriteria,
              teacherName,
            },
          },
        });
        setCriteriaStatus(finalCriteriaStatus);
        setPracticeReport(report);
        setLessonCompleted(true);
        setLessonCompletedInSession(true);
      }

      void speak(assistantReply, assistantIndex, { interrupt: true });
    })()
      .catch((error) => {
        setError(getErrorMessage(error) || 'Tutor is unavailable.');
      })
      .finally(() => {
        setPending(false);
      });
  }

  const showGuidedChecklist =
    activePracticeMode === 'guided' && criteriaStatus.length > 0;
  const recordingBusy = recordingStatus !== 'idle';
  const canSubmit =
    !pending && !autoStarting && !recordingBusy && Boolean(text.trim());
  const micDisabled =
    autoStarting || pending || recordingStatus === 'transcribing';
  const mobileVoiceStatus =
    recordingStatus === 'recording'
      ? 'Listening'
      : recordingStatus === 'transcribing'
        ? 'Transcribing'
        : text.trim()
          ? 'Transcript ready'
          : 'Tap to speak';
  const mobileVoiceHint =
    recordingStatus === 'recording'
      ? 'Tap again when you finish.'
      : recordingStatus === 'transcribing'
        ? 'Turning your speech into text.'
        : text.trim()
          ? text.trim()
          : modeDescription;

  function renderStatusAlerts() {
    return (
      <>
        {error ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        ) : null}
        {!speechSupported ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Microphone recording is unavailable. Text practice still works.
          </p>
        ) : null}
        {recordingStatus === 'recording' ? (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            Recording. Tap the mic again to transcribe.
          </p>
        ) : null}
        {recordingStatus === 'transcribing' ? (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            Transcribing your speech...
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 pt-5 pb-56 md:px-8 md:py-10">
      <div className="rounded-[1.75rem] border border-emerald-950/10 bg-white p-4 shadow-sm md:rounded-3xl md:p-5 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
          {modeLabel}
        </div>
        <h1 className="mt-2 text-2xl leading-tight font-black tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-zinc-600 sm:block dark:text-zinc-300">
          {modeDescription}
        </p>
      </div>

      {showGuidedChecklist ? (
        <LessonChecklist criteriaStatus={criteriaStatus} />
      ) : null}

      {lessonCompletedInSession ? (
        <PracticeReportCard
          criteriaStatus={criteriaStatus}
          lessonId={lesson?.id}
          nextLessonId={nextLessonId}
          report={practiceReport}
        />
      ) : null}

      <div className="mt-4 flex-1 rounded-[1.75rem] border border-emerald-950/10 bg-white p-3 md:mt-5 md:rounded-3xl md:p-4 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 md:max-w-[82%]',
                message.role === 'user'
                  ? 'ml-auto bg-emerald-500 text-white'
                  : 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-zinc-50'
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.role === 'assistant' ? (
                <button
                  type="button"
                  onClick={() => speak(message.content, index)}
                  disabled={speakingMessageIndex !== null}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                >
                  {speakingMessageIndex === index ? (
                    speakingPhase === 'loading' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="size-3.5" />
                    )
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                  {speakingMessageIndex === index
                    ? speakingPhase === 'loading'
                      ? 'Loading'
                      : 'Playing'
                    : 'Play'}
                </button>
              ) : null}
            </div>
          ))}
          {autoStarting ? (
            <div className="flex max-w-[82%] items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              <Loader2 className="size-4 animate-spin" />
              Tutor is starting the lesson
            </div>
          ) : null}
          {pending ? (
            <div className="flex max-w-[82%] items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              <Loader2 className="size-4 animate-spin" />
              Tutor is reading your answer
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-5 mt-5 hidden rounded-3xl border border-emerald-950/10 bg-white p-3 shadow-lg shadow-emerald-950/5 md:block dark:border-white/10 dark:bg-zinc-900">
        {renderStatusAlerts()}
        <div className="flex items-center gap-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              autoStarting
                ? 'Wait for the tutor to start...'
                : recordingStatus === 'recording'
                  ? 'Recording your answer...'
                  : recordingStatus === 'transcribing'
                    ? 'Transcribing your speech...'
                    : 'Type or dictate your answer...'
            }
            rows={1}
            className="h-12 min-h-12 flex-1 resize-none overflow-y-auto rounded-2xl py-[11px] leading-6"
            disabled={
              autoStarting || pending || recordingStatus === 'recording'
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-12 rounded-2xl"
            onClick={
              recordingStatus === 'recording' ? stopListening : startListening
            }
            disabled={
              autoStarting || pending || recordingStatus === 'transcribing'
            }
          >
            {recordingStatus === 'transcribing' ? (
              <Loader2 className="size-5 animate-spin" />
            ) : recordingStatus === 'recording' ? (
              <MicOff className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            className="size-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={submit}
            disabled={!canSubmit}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="mx-auto max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)_+_1rem)]">
          <div className="rounded-[2rem] border border-emerald-950/10 bg-white/95 p-3 shadow-2xl shadow-emerald-950/10 backdrop-blur dark:border-white/10 dark:bg-zinc-900/95">
            {renderStatusAlerts()}

            {mobileInputMode === 'voice' ? (
              <div className="grid justify-items-center gap-3 py-2 text-center">
                <button
                  type="button"
                  onClick={
                    recordingStatus === 'recording'
                      ? stopListening
                      : startListening
                  }
                  disabled={micDisabled}
                  className={cn(
                    'relative flex size-24 items-center justify-center rounded-full text-white shadow-xl shadow-emerald-900/20 transition active:scale-[0.98]',
                    recordingStatus === 'recording'
                      ? 'bg-red-500'
                      : 'bg-emerald-500',
                    micDisabled ? 'opacity-60' : 'hover:bg-emerald-600'
                  )}
                  aria-label={
                    recordingStatus === 'recording'
                      ? 'Stop recording'
                      : 'Start recording'
                  }
                >
                  {recordingStatus === 'transcribing' ? (
                    <Loader2 className="size-9 animate-spin" />
                  ) : recordingStatus === 'recording' ? (
                    <MicOff className="size-9" />
                  ) : (
                    <Mic className="size-10" />
                  )}
                  {recordingStatus === 'recording' ? (
                    <span className="absolute inset-0 rounded-full border-4 border-red-300/60" />
                  ) : null}
                </button>

                <div className="max-w-[18rem]">
                  <div className="text-sm font-black text-zinc-950 dark:text-zinc-50">
                    {mobileVoiceStatus}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {mobileVoiceHint}
                  </p>
                </div>

                <div className="flex w-full items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-2xl border-emerald-200 px-4 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-200"
                    onClick={() => setMobileInputMode('text')}
                  >
                    <Keyboard className="size-4" />
                    Type
                  </Button>
                  {text.trim() ? (
                    <Button
                      type="button"
                      className="h-11 rounded-2xl bg-emerald-500 px-5 text-white hover:bg-emerald-600"
                      onClick={submit}
                      disabled={!canSubmit}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Send
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <Textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={
                    autoStarting
                      ? 'Wait for the tutor to start...'
                      : recordingStatus === 'recording'
                        ? 'Recording your answer...'
                        : recordingStatus === 'transcribing'
                          ? 'Transcribing your speech...'
                          : 'Type your answer...'
                  }
                  rows={3}
                  className="min-h-24 resize-none rounded-2xl leading-6"
                  disabled={
                    autoStarting || pending || recordingStatus === 'recording'
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-12 rounded-2xl"
                    onClick={() => setMobileInputMode('voice')}
                  >
                    <Mic className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    className="h-12 flex-1 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600"
                    onClick={submit}
                    disabled={!canSubmit}
                  >
                    {pending ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Send className="size-5" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonChecklist({
  criteriaStatus,
}: {
  criteriaStatus: TutorCriteriaStatus[];
}) {
  const metCount = criteriaProgress(criteriaStatus);
  const total = criteriaStatus.length;

  return (
    <section className="mt-5 rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
          <Sparkles className="size-4" />
          Lesson checklist
        </div>
        <Badge
          variant="secondary"
          className="w-fit rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100"
        >
          {metCount}/{total} done
        </Badge>
      </div>
      <div className="mt-4 grid gap-2">
        {criteriaStatus.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-start gap-3 rounded-2xl border px-3 py-2 text-sm leading-5',
              item.status === 'met'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-50'
                : item.status === 'missed'
                  ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-50'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200'
            )}
          >
            {item.status === 'met' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-current opacity-60" />
            )}
            <span className="min-w-0 flex-1">
              <span className="font-bold">{item.label}</span>
              {item.evidence ? (
                <span className="mt-1 block text-xs opacity-75">
                  {item.evidence}
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PracticeReportCard({
  criteriaStatus,
  lessonId,
  nextLessonId,
  report,
}: {
  criteriaStatus: TutorCriteriaStatus[];
  lessonId?: number;
  nextLessonId?: number;
  report: TutorPracticeReport | null;
}) {
  const score = report?.score ?? 82;
  const metItems = criteriaStatus.filter((item) => item.status === 'met');
  const weakPoints = report?.weak_points ?? [];
  const reviewItems = report?.review_items ?? [];
  const targetChunks = report?.target_chunks_used ?? [];

  return (
    <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-50">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <div>
            <div className="text-lg font-black">AI speaking report</div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900/75 dark:text-emerald-50/75">
              {report?.feedback_summary ||
                'You reached the lesson target. Review it, keep talking, or continue to the next lesson.'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <div className="text-3xl font-black">{score}</div>
          <div className="text-xs font-bold text-emerald-900/60 uppercase dark:text-emerald-50/60">
            overall score
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-emerald-200 pt-4 md:grid-cols-2 dark:border-emerald-400/20">
        <ReportList
          title="Completed goals"
          items={metItems.map((item) => item.label)}
        />
        <ReportList title="Review items" items={reviewItems} />
        <ReportList title="Weak points" items={weakPoints} />
        <ReportList title="Target chunks used" items={targetChunks} />
      </div>

      {report?.improved_sentence?.improved ? (
        <div className="mt-4 border-t border-emerald-200 pt-4 text-sm leading-6 dark:border-emerald-400/20">
          {report.improved_sentence.original ? (
            <div className="text-emerald-900/70 dark:text-emerald-50/70">
              Original: {report.improved_sentence.original}
            </div>
          ) : null}
          <div className="font-bold">
            Better: {report.improved_sentence.improved}
          </div>
          {report.improved_sentence.reason ? (
            <div className="text-emerald-900/70 dark:text-emerald-50/70">
              Why: {report.improved_sentence.reason}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-emerald-200 pt-4 dark:border-emerald-400/20">
        {lessonId ? (
          <>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-500/10"
            >
              <Link href={`/practice?lesson=${lessonId}`}>
                <RotateCcw className="size-4" />
                Review again
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-500/10"
            >
              <Link href={`/practice?lesson=${lessonId}&mode=free`}>
                <MessageCircle className="size-4" />
                Free talk
              </Link>
            </Button>
          </>
        ) : null}
        {nextLessonId ? (
          <Button
            asChild
            className="h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Link href={`/practice?lesson=${nextLessonId}`}>
              <ArrowRight className="size-4" />
              Next lesson
            </Link>
          </Button>
        ) : null}
        <Button
          asChild
          variant="ghost"
          className="h-10 rounded-xl text-emerald-800 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-500/10"
        >
          <Link href="/lessons">Back to lessons</Link>
        </Button>
      </div>
    </section>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-black text-emerald-900/60 uppercase dark:text-emerald-50/60">
        {title}
      </div>
      <ul className="mt-2 grid gap-1 text-sm leading-6">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
