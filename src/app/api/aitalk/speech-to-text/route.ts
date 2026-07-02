import { NextResponse } from 'next/server';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const STT_AGENT_URL =
  process.env.AITALK_STT_AGENT_URL ||
  process.env.COURSE_TUTOR_AGENT_STT_URL ||
  'https://agent.aitalk.im/speech-to-text';
const DEFAULT_STT_LANGUAGE = 'en';

type RuntimeEnv = Record<string, unknown>;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getCloudflareEnv() {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return env as RuntimeEnv;
  } catch {
    return {} as RuntimeEnv;
  }
}

function readEnvValue(env: RuntimeEnv, name: string) {
  const value = env[name];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return process.env[name]?.trim() || '';
}

function readUpstreamError(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return typeof record.message === 'string' ? record.message : '';
}

function normalizeSttLanguage(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return DEFAULT_STT_LANGUAGE;
  const normalized = value.trim().split('-')[0]?.toLowerCase() || '';
  return normalized || DEFAULT_STT_LANGUAGE;
}

export async function POST(request: Request) {
  try {
    const runtimeEnv = await getCloudflareEnv();
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

    const input = await request.formData();
    const file = input.get('file');
    if (!(file instanceof File)) return jsonError('Audio file is required.');
    if (file.size <= 0) return jsonError('Audio file is empty.');
    if (file.size > MAX_AUDIO_BYTES) {
      return jsonError('Audio file is too large.', 413);
    }

    const normalizedLanguage = normalizeSttLanguage(input.get('language'));
    const agentUrl =
      readEnvValue(runtimeEnv, 'AITALK_STT_AGENT_URL') ||
      readEnvValue(runtimeEnv, 'COURSE_TUTOR_AGENT_STT_URL') ||
      STT_AGENT_URL;
    const agentFormData = new FormData();
    agentFormData.set('file', file, file.name || 'speech.webm');
    agentFormData.set('language', normalizedLanguage);

    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: agentFormData,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = readUpstreamError(data) || 'Speech transcription failed.';
      console.error('aitalk_speech_to_text_agent_failed', {
        status: response.status,
        body: JSON.stringify(data).slice(0, 500),
      });
      return jsonError(error, response.status);
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('aitalk_speech_to_text_failed', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return jsonError(error?.message || 'Speech transcription failed.', 500);
  }
}
