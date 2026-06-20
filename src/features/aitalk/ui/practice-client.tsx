'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { askTutorAction } from '@/features/aitalk/actions';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/features/aitalk/constants';
import {
  buildAitalkSpeechSsml,
  DEFAULT_AITALK_SPEECH_STYLE,
  normalizeAitalkSpeechLang,
  prepareAitalkSpeechText,
  resolveAitalkVoiceName,
} from '@/features/aitalk/lib/tts';
import { createAitalkBrowserClient } from '@/features/aitalk/supabase/browser';
import { Loader2, Mic, MicOff, Send, Volume2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

import { displayLessonTitle } from '../data';
import type { LessonListDetail, PracticeMessage } from '../types';

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

type SpeechSdkModule = typeof import('microsoft-cognitiveservices-speech-sdk');
type AzureSpeechSynthesizer = InstanceType<
  SpeechSdkModule['SpeechSynthesizer']
>;
type AzureSpeakerDestination = InstanceType<
  SpeechSdkModule['SpeakerAudioDestination']
>;

const TTS_CACHE_DB = 'aitalk-tts-cache-v1';
const TTS_CACHE_STORE = 'audio';
const AZURE_SPEECH_TOKEN_REFRESH_BUFFER_MS = 60_000;

type AzureSpeechTokenResponse = {
  error?: string;
  expiresIn?: number;
  region?: string;
  token?: string;
};

type AzureSpeechToken = {
  expiresAt: number;
  region: string;
  token: string;
};

type SpeechInput = {
  lang: string;
  name: string;
  rate: string;
  style: string;
  text: string;
};

type SpeakOptions = {
  interrupt?: boolean;
};

type SpeakingPhase = 'loading' | 'playing';

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
  lesson,
  locale,
  speechLocale,
  speechStyle,
  voiceName,
}: {
  lesson: LessonListDetail | null;
  locale: string;
  speechLocale: string;
  speechStyle?: string;
  voiceName?: string;
}) {
  const [messages, setMessages] = useState<PracticeMessage[]>([
    {
      role: 'assistant',
      content:
        'Tell me one sentence in your target language. I will correct it and ask a follow-up.',
    },
  ]);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState('');
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<
    number | null
  >(null);
  const [speakingPhase, setSpeakingPhase] = useState<SpeakingPhase>('loading');
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createAitalkBrowserClient(), []);
  const recognitionRef = useRef<AitalkSpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef('');
  const audioUnlockedRef = useRef(false);
  const speechRunIdRef = useRef(0);
  const azureSpeechTokenRef = useRef<AzureSpeechToken | null>(null);
  const azureSpeechSdkPromiseRef = useRef<Promise<SpeechSdkModule> | null>(
    null
  );
  const azureSpeakerRef = useRef<AzureSpeakerDestination | null>(null);
  const azureSynthesizerRef = useRef<AzureSpeechSynthesizer | null>(null);

  const title = useMemo(() => displayLessonTitle(lesson), [lesson]);

  useEffect(() => {
    setSpeechSupported(Boolean(resolveSpeechRecognition()));
  }, []);

  useEffect(() => {
    const preloadSpeechSdk = () => {
      Promise.all([loadAzureSpeechSdk(), getAzureSpeechToken()]).catch(
        () => undefined
      );
    };
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(preloadSpeechSdk);
      return () => window.cancelIdleCallback(handle);
    }

    const handle = setTimeout(preloadSpeechSdk, 1200);
    return () => clearTimeout(handle);
  }, []);

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

  function loadAzureSpeechSdk() {
    azureSpeechSdkPromiseRef.current ??= import(
      'microsoft-cognitiveservices-speech-sdk'
    );
    return azureSpeechSdkPromiseRef.current;
  }

  function revokeCurrentAudioUrl() {
    if (!audioUrlRef.current) return;
    URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = '';
  }

  function closeAzureSpeech() {
    azureSynthesizerRef.current?.close();
    azureSynthesizerRef.current = null;
    azureSpeakerRef.current?.pause();
    azureSpeakerRef.current?.close();
    azureSpeakerRef.current = null;
  }

  function stopCurrentSpeech() {
    audioRef.current?.pause();
    audioRef.current = null;
    revokeCurrentAudioUrl();
    closeAzureSpeech();
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
      await speakWithAzureSpeechSdk(input, markPlaybackStarted);
    } catch (error: any) {
      console.warn('aitalk_azure_speech_playback_failed', error);
      try {
        await playCachedSpeechAudio(input, cacheKey, markPlaybackStarted);
      } catch (fallbackError) {
        const message =
          getErrorMessage(fallbackError) ||
          getErrorMessage(error) ||
          'Text-to-speech failed.';
        setError(message);
      }
    } finally {
      if (speechRunIdRef.current === speechRunId) {
        setSpeakingMessageIndex(null);
        setSpeakingPhase('loading');
      }
    }
  }

  async function getAzureSpeechToken() {
    const cached = azureSpeechTokenRef.current;
    if (
      cached &&
      cached.expiresAt - AZURE_SPEECH_TOKEN_REFRESH_BUFFER_MS > Date.now()
    ) {
      return cached;
    }

    const response = await fetch('/api/aitalk/azure-speech-token', {
      method: 'POST',
    });
    const data = (await response
      .json()
      .catch(() => null)) as AzureSpeechTokenResponse | null;
    if (!response.ok) {
      throw new Error(data?.error || 'Azure Speech failed.');
    }
    if (!data?.token || !data.region) {
      throw new Error('Azure Speech token is invalid.');
    }

    const nextToken = {
      token: data.token,
      region: data.region,
      expiresAt: Date.now() + (data.expiresIn || 540) * 1000,
    };
    azureSpeechTokenRef.current = nextToken;
    return nextToken;
  }

  async function speakWithAzureSpeechSdk(
    input: SpeechInput,
    onPlaybackStart?: () => void
  ) {
    const [SpeechSDK, auth] = await Promise.all([
      loadAzureSpeechSdk(),
      getAzureSpeechToken(),
    ]);

    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      auth.token,
      auth.region
    );
    speechConfig.speechSynthesisLanguage = input.lang;
    speechConfig.speechSynthesisVoiceName = input.name;
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    const speaker = new SpeechSDK.SpeakerAudioDestination();
    const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(speaker);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(
      speechConfig,
      audioConfig
    );
    azureSpeakerRef.current = speaker;
    azureSynthesizerRef.current = synthesizer;

    const ssml = buildAitalkSpeechSsml(input);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let playbackStarted = false;
      let playbackStartedAt = 0;
      let playbackFallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const close = () => {
        if (playbackFallbackTimer) {
          clearTimeout(playbackFallbackTimer);
          playbackFallbackTimer = null;
        }
        audioConfig.close();
        if (azureSynthesizerRef.current === synthesizer) {
          azureSynthesizerRef.current = null;
        }
        if (azureSpeakerRef.current === speaker) {
          azureSpeakerRef.current = null;
        }
        synthesizer.close();
      };
      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        close();
        resolve();
      };
      const rejectOnce = (error: unknown) => {
        if (settled) return;
        settled = true;
        close();
        reject(error);
      };
      const schedulePlaybackFallback = (audioDuration?: number) => {
        if (settled) return;
        if (playbackFallbackTimer) return;

        const durationMs =
          typeof audioDuration === 'number' && audioDuration > 0
            ? audioDuration / 10_000
            : Math.min(30_000, Math.max(2_500, input.text.length * 80));
        const elapsedMs = playbackStartedAt
          ? Date.now() - playbackStartedAt
          : 0;
        const remainingMs = Math.max(1_000, durationMs - elapsedMs + 1_500);
        playbackFallbackTimer = setTimeout(resolveOnce, remainingMs);
      };

      speaker.onAudioStart = () => {
        playbackStarted = true;
        playbackStartedAt = Date.now();
        onPlaybackStart?.();
      };
      speaker.onAudioEnd = () => {
        resolveOnce();
      };

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.Canceled) {
            rejectOnce(
              new Error(result.errorDetails || 'Azure Speech failed.')
            );
            return;
          }
          if (!playbackStarted && !result.audioData?.byteLength) {
            rejectOnce(new Error('Azure Speech returned empty audio.'));
            return;
          }
          schedulePlaybackFallback(result.audioDuration);
        },
        (error) => {
          rejectOnce(
            new Error(getErrorMessage(error) || 'Azure Speech failed.')
          );
        }
      );
    });
  }

  async function playCachedSpeechAudio(
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
    if (!nextText || pending) return;
    unlockAudioPlayback();
    const nextMessages: PracticeMessage[] = [
      ...messages,
      { role: 'user', content: nextText },
    ];
    setMessages(nextMessages);
    setText('');
    setError('');

    startTransition(async () => {
      const result = await askTutorAction({
        lessonId: lesson?.id,
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
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: assistantReply,
        },
      ]);
      void speak(assistantReply, nextMessages.length, { interrupt: true });
    });
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-6 md:px-8 md:py-10">
      <div className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
          Guided speaking
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Use your microphone when available, or type. The tutor will respond
          with practical corrections and a follow-up prompt.
        </p>
      </div>

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
              <div>{message.content}</div>
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
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or dictate your answer..."
            className="min-h-12 flex-1 resize-none rounded-2xl"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
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
          >
            {listening ? (
              <MicOff className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            className="size-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={submit}
            disabled={pending || !text.trim()}
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
