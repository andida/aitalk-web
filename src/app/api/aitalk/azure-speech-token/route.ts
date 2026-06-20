import { NextResponse } from 'next/server';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';

const DEFAULT_AZURE_SPEECH_REGION = 'southeastasia';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST() {
  try {
    const supabase = await createAitalkServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return jsonError('Unauthorized.', 401);

    const speechKey = process.env.AZURE_SPEECH_KEY?.trim();
    const region =
      process.env.AZURE_SPEECH_REGION?.trim() || DEFAULT_AZURE_SPEECH_REGION;
    if (!speechKey) {
      console.error('aitalk_azure_speech_key_missing');
      return jsonError('Azure Speech is not configured.', 503);
    }

    const response = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('aitalk_azure_speech_token_failed', {
        status: response.status,
        body: errorText.slice(0, 500),
      });
      return jsonError('Azure Speech token failed.', response.status);
    }

    const token = await response.text();
    if (!token) return jsonError('Azure Speech token is empty.', 502);

    return NextResponse.json(
      {
        expiresIn: 540,
        region,
        token,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('aitalk_azure_speech_token_error', {
      message: error?.message,
    });
    return jsonError(error?.message || 'Azure Speech token failed.', 500);
  }
}
