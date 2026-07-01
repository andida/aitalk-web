import { NextResponse } from 'next/server';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const STT_MODEL =
  process.env.AITALK_STT_MODEL || 'openai/gpt-4o-mini-transcribe';
const STT_TRANSCRIPTIONS_URL =
  process.env.AITALK_STT_TRANSCRIPTIONS_URL ||
  'https://openrouter.ai/api/v1/audio/transcriptions';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function readProviderError(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return typeof record.message === 'string' ? record.message : '';
}

function readTranscriptText(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const text = (value as Record<string, unknown>).text;
  return typeof text === 'string' ? text.trim() : '';
}

function resolveAudioFormat(file: File) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.includes('webm') || name.endsWith('.webm')) return 'webm';
  if (type.includes('wav') || name.endsWith('.wav')) return 'wav';
  if (type.includes('mpeg') || name.endsWith('.mp3')) return 'mp3';
  if (type.includes('mp3') || name.endsWith('.mp3')) return 'mp3';
  if (type.includes('flac') || name.endsWith('.flac')) return 'flac';
  if (type.includes('ogg') || name.endsWith('.ogg')) return 'ogg';
  if (type.includes('aac') || name.endsWith('.aac')) return 'aac';
  if (type.includes('mp4') || name.endsWith('.m4a')) return 'm4a';

  return 'webm';
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

export async function POST(request: Request) {
  try {
    const supabase = await createAitalkServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return jsonError('Unauthorized.', 401);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return jsonError('Unauthorized.', 401);

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return jsonError('OPENROUTER_API_KEY is not set.', 500);

    const input = await request.formData();
    const file = input.get('file');
    if (!(file instanceof File)) return jsonError('Audio file is required.');
    if (file.size <= 0) return jsonError('Audio file is empty.');
    if (file.size > MAX_AUDIO_BYTES) {
      return jsonError('Audio file is too large.', 413);
    }

    const language = input.get('language');
    const normalizedLanguage =
      typeof language === 'string' && language.trim() ? language.trim() : null;
    const requestBody = {
      model: STT_MODEL,
      input_audio: {
        data: await fileToBase64(file),
        format: resolveAudioFormat(file),
      },
      ...(normalizedLanguage ? { language: normalizedLanguage } : {}),
    };

    const response = await fetch(STT_TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aitalk.im',
        'X-Title': 'AITalk SpeechToText',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => null);
    const providerError = readProviderError(data);
    if (!response.ok) {
      console.error('aitalk_speech_to_text_provider_failed', {
        status: response.status,
        body: JSON.stringify(data).slice(0, 500),
      });
      return jsonError(
        providerError || 'Speech transcription failed.',
        response.status
      );
    }

    const text = readTranscriptText(data);
    return NextResponse.json(
      {
        text,
        language: normalizedLanguage,
        model: STT_MODEL,
        provider: 'openrouter',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('aitalk_speech_to_text_failed', {
      message: error?.message,
    });
    return jsonError(error?.message || 'Speech transcription failed.', 500);
  }
}
