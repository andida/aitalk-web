import { NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/features/aitalk/constants';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';

const DEFAULT_VOICE_NAME = 'en-US-JennyNeural';
const DEFAULT_LANG = 'en-US';
const DEFAULT_STYLE = 'friendly';

const VOICE_BY_LANG: Record<string, string> = {
  'en-us': 'en-US-JennyNeural',
  en: 'en-US-JennyNeural',
  'zh-cn': 'zh-CN-XiaoxiaoNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  'zh-hk': 'zh-HK-HiuMaanNeural',
  'zh-tw': 'zh-TW-HsiaoChenNeural',
  'ja-jp': 'ja-JP-NanamiNeural',
  ja: 'ja-JP-NanamiNeural',
  'ko-kr': 'ko-KR-SunHiNeural',
  ko: 'ko-KR-SunHiNeural',
  'fr-fr': 'fr-FR-DeniseNeural',
  fr: 'fr-FR-DeniseNeural',
  'de-de': 'de-DE-KatjaNeural',
  de: 'de-DE-KatjaNeural',
  'it-it': 'it-IT-ElsaNeural',
  it: 'it-IT-ElsaNeural',
  'es-es': 'es-ES-ElviraNeural',
  es: 'es-ES-ElviraNeural',
  'pt-br': 'pt-BR-FranciscaNeural',
  pt: 'pt-BR-FranciscaNeural',
  'vi-vn': 'vi-VN-HoaiMyNeural',
  vi: 'vi-VN-HoaiMyNeural',
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeLang(value: unknown) {
  const lang = typeof value === 'string' ? value.trim() : '';
  return lang || DEFAULT_LANG;
}

function resolveVoiceName(lang: string, value: unknown) {
  const requested = typeof value === 'string' ? value.trim() : '';
  if (requested) return requested;
  const normalized = lang.toLowerCase();
  return (
    VOICE_BY_LANG[normalized] ||
    VOICE_BY_LANG[normalized.split('-')[0]] ||
    DEFAULT_VOICE_NAME
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
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

    const lang = normalizeLang(body?.lang);
    const voiceName = resolveVoiceName(lang, body?.name);

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
          rate: body?.rate || 1,
          name: voiceName,
          lang,
          style: body?.style || DEFAULT_STYLE,
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
