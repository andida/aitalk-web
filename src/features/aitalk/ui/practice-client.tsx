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
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Volume2,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
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
} from '../types';

type AitalkSpeechRecognitionConstructor = new () => AitalkSpeechRecognition;

type AitalkSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
};

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

function resolveSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: AitalkSpeechRecognitionConstructor;
      webkitSpeechRecognition?: AitalkSpeechRecognitionConstructor;
    };
  return (
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition ||
    null
  );
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

function buildLessonTutorTopic(title: string, practiceMode: PracticeMode) {
  if (practiceMode === 'review') {
    return [
      title,
      'This is a completed lesson review. Revisit the same goal, keep the structure guided, and do not mark the lesson complete again.',
    ].join('\n\n');
  }

  if (practiceMode === 'free') {
    return [
      title,
      'The learner already completed this lesson. Use the lesson as context, but keep the conversation open-ended and natural.',
    ].join('\n\n');
  }

  return title;
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
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState('');
  const [autoStarting, setAutoStarting] = useState(false);
  const [pending, setPending] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(
    progressStatus === 'completed' || activePracticeMode !== 'guided'
  );
  const [lessonCompletedInSession, setLessonCompletedInSession] =
    useState(false);
  const [hydratedScope, setHydratedScope] = useState('');
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<
    number | null
  >(null);
  const [speakingPhase, setSpeakingPhase] = useState<SpeakingPhase>('loading');
  const supabase = useMemo(() => createAitalkBrowserClient(), []);
  const recognitionRef = useRef<AitalkSpeechRecognition | null>(null);
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
    if (!activeTopic) return buildLessonTutorTopic(title, activePracticeMode);
    return [
      buildTopicTutorPrompt(activeTopic),
      buildTopicTeacherHintInstruction(learnLanguage, nativeLanguage),
    ]
      .filter(Boolean)
      .join('\n\n');
  }, [activePracticeMode, activeTopic, learnLanguage, nativeLanguage, title]);

  useEffect(() => {
    setText('');
    setError('');
    setLessonCompleted(
      progressStatus === 'completed' || activePracticeMode !== 'guided'
    );
    setLessonCompletedInSession(false);
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
  ]);

  useEffect(() => {
    if (!storageKey || hydratedScope !== practiceScope) return;
    saveStoredMessages(storageKey, messages);
  }, [hydratedScope, messages, practiceScope, storageKey]);

  useEffect(() => {
    setSpeechSupported(Boolean(resolveSpeechRecognition()));
  }, []);

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
      stopCurrentSpeech();
    };
  }, []);

  function startListening() {
    const Recognition = resolveSpeechRecognition();
    if (!Recognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = speechLocale || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript)
        .filter(Boolean)
        .join(' ');
      setText(transcript);
    };
    recognition.onerror = () => {
      setError('Speech recognition failed. You can keep typing instead.');
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    setError('');
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
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

  function submit() {
    const nextText = text.trim();
    if (!nextText || pending || autoStarting) return;
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
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: assistantReply,
        },
      ]);

      if (
        activePracticeMode === 'guided' &&
        lesson?.id &&
        !lessonCompleted &&
        isTutorCompletion(result.raw)
      ) {
        await completeLessonFromPracticeAction({
          lessonId: lesson.id,
          locale,
          planId,
        });
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

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-6 md:px-8 md:py-10">
      <div className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
          {modeLabel}
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {modeDescription}
        </p>
      </div>

      {lessonCompletedInSession ? (
        <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <div>
                <div className="text-lg font-black">Lesson completed</div>
                <p className="mt-1 text-sm leading-6 text-emerald-900/75 dark:text-emerald-50/75">
                  You reached the lesson target. Review it, keep talking, or
                  continue to the next lesson.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-500/10"
              >
                <Link href={`/practice?lesson=${lesson?.id}`}>
                  <RotateCcw className="size-4" />
                  Review again
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-500/10"
              >
                <Link href={`/practice?lesson=${lesson?.id}&mode=free`}>
                  <MessageCircle className="size-4" />
                  Free talk
                </Link>
              </Button>
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
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex-1 rounded-3xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6',
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

      <div className="sticky bottom-20 mt-5 rounded-3xl border border-emerald-950/10 bg-white p-3 shadow-lg shadow-emerald-950/5 md:bottom-5 dark:border-white/10 dark:bg-zinc-900">
        {error ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        ) : null}
        {!speechSupported ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Browser speech recognition is unavailable. Text practice still
            works.
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              autoStarting
                ? 'Wait for the tutor to start...'
                : 'Type or dictate your answer...'
            }
            rows={1}
            className="h-12 min-h-12 flex-1 resize-none overflow-y-auto rounded-2xl py-[11px] leading-6"
            disabled={autoStarting || pending}
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
            onClick={listening ? stopListening : startListening}
            disabled={autoStarting || pending}
          >
            {listening ? (
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
            disabled={pending || autoStarting || !text.trim()}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
