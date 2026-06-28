import { NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/features/aitalk/constants';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

    const input = await request.formData();
    const file = input.get('file');
    if (!(file instanceof File)) return jsonError('Audio file is required.');
    if (file.size <= 0) return jsonError('Audio file is empty.');
    if (file.size > MAX_AUDIO_BYTES) {
      return jsonError('Audio file is too large.', 413);
    }

    const formData = new FormData();
    formData.set('file', file, file.name || 'speech.webm');
    const language = input.get('language');
    const prompt = input.get('prompt');
    if (typeof language === 'string' && language.trim()) {
      formData.set('language', language.trim());
    }
    if (typeof prompt === 'string' && prompt.trim()) {
      formData.set('prompt', prompt.trim());
    }

    const response = await fetch(
      `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/speech-to-text`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('aitalk_speech_to_text_function_failed', {
        status: response.status,
        body: JSON.stringify(data).slice(0, 500),
      });
      return jsonError(
        data?.error || data?.message || 'Speech transcription failed.',
        response.status
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('aitalk_speech_to_text_failed', {
      message: error?.message,
    });
    return jsonError(error?.message || 'Speech transcription failed.', 500);
  }
}
