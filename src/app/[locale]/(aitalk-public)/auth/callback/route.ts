import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeAitalkRedirect,
  withLocale,
} from '@/features/aitalk/lib/paths';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');
  const next = normalizeAitalkRedirect(requestUrl.searchParams.get('next'));

  const loginUrl = new URL(withLocale('/login', locale), request.url);
  loginUrl.searchParams.set('redirect', next);

  if (oauthError || !code) {
    if (oauthError) {
      loginUrl.searchParams.set('error', oauthError);
    }
    return NextResponse.redirect(loginUrl);
  }

  const hasPkceVerifier = request.cookies.getAll().some(({ name }) => {
    return name.includes('auth-token-code-verifier');
  });

  console.info('aitalk_oauth_callback_forward', {
    hasPkceVerifier,
    next,
    host: requestUrl.host,
  });

  const finishUrl = new URL(
    withLocale('/auth/callback/client', locale),
    request.url
  );
  finishUrl.searchParams.set('code', code);
  finishUrl.searchParams.set('next', next);

  return NextResponse.redirect(finishUrl);
}
