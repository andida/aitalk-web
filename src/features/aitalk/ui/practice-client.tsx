'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Loader2, Mic, MicOff, Send, Volume2 } from 'lucide-react';

import { askTutorAction } from '@/features/aitalk/actions';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

import type { LessonListDetail, PracticeMessage } from '../types';
import { displayLessonTitle } from '../data';

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

function resolveSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: AitalkSpeechRecognitionConstructor;
      webkitSpeechRecognition?: AitalkSpeechRecognitionConstructor;
    };
  return (
    speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null
  );
}

export function PracticeClient({
  lesson,
  locale,
  speechLocale,
}: {
  lesson: LessonListDetail | null;
  locale: string;
  speechLocale: string;
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
  const [pending, startTransition] = useTransition();
  const recognitionRef = useRef<AitalkSpeechRecognition | null>(null);

  const title = useMemo(() => displayLessonTitle(lesson), [lesson]);

  useEffect(() => {
    setSpeechSupported(Boolean(resolveSpeechRecognition()));
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

  function speak(value: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = speechLocale || 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  function submit() {
    const nextText = text.trim();
    if (!nextText || pending) return;
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

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            result.reply ||
            'Good. Try again with one more detail and clearer pronunciation.',
        },
      ]);
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
                  onClick={() => speak(message.content)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                >
                  <Volume2 className="size-3.5" />
                  Play
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
            {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
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
