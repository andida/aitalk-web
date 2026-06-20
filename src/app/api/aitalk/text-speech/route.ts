import { NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/features/aitalk/constants';
import {
  DEFAULT_AITALK_SPEECH_STYLE,
  normalizeAitalkSpeechLang,
  prepareAitalkSpeechText,
  resolveAitalkVoiceName,
} from '@/features/aitalk/lib/tts';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const lang = normalizeAitalkSpeechLang(body?.lang);
    const rawText = typeof body?.text === 'string' ? body.text : '';
    const text = prepareAitalkSpeechText(rawText, lang);
    if (!text) return jsonError('Text is required.');
    if (text.length > 4000) return jsonError('Text is too long.', 413);

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

    const voiceName = resolveAitalkVoiceName(lang, body?.name);

    const response = await fetch(
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
          text,
          rate: body?.rate || 'default',
          name: voiceName,
          lang,
          style: body?.style || DEFAULT_AITALK_SPEECH_STYLE,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('aitalk_text_speech_function_failed', {
        status: response.status,
        body: errorText.slice(0, 500),
      });
      return jsonError('Text-to-speech failed.', response.status);
    }

    const audio = await response.arrayBuffer();
    if (audio.byteLength === 0) {
      return jsonError('Generated audio is empty.', 502);
    }

    return new Response(audio, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Length': String(audio.byteLength),
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('aitalk_text_speech_failed', {
      message: error?.message,
    });
    return jsonError(error?.message || 'Text-to-speech failed.', 500);
  }
}
