import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/features/aitalk/constants';
import { getProfile, getProfileCompleteness } from '@/features/aitalk/data';
import {
  normalizeAitalkRedirect,
  withLocale,
} from '@/features/aitalk/lib/paths';
import { createServerClient } from '@supabase/ssr';

function redirectWithCookies(url: URL, cookiesToSet: any[]) {
  const response = NextResponse.redirect(url);
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = normalizeAitalkRedirect(requestUrl.searchParams.get('next'));
  const cookiesToSet: any[] = [];

  const loginUrl = new URL(withLocale('/login', locale), request.url);
  loginUrl.searchParams.set('redirect', next);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookies) {
        cookiesToSet.push(...nextCookies);
        nextCookies.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    loginUrl.searchParams.set('error', 'oauth_callback');
    return redirectWithCookies(loginUrl, cookiesToSet);
  }

  const profile = await getProfile(supabase).catch(() => null);
  const destination = getProfileCompleteness(profile) ? next : '/onboarding';

  return redirectWithCookies(
    new URL(withLocale(destination, locale), request.url),
    cookiesToSet
  );
}
