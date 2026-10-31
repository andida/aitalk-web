import {
  getCookieFromCtx,
  getHeaderValue,
  guessLocaleFromAcceptLanguage,
} from '@/shared/lib/cookie';

type EnrichmentDependencies = {
  getClientIp: () => Promise<string | undefined>;
  getLocale: () => Promise<string>;
};

export async function enrichNewUser<T extends Record<string, unknown>>(
  user: T,
  ctx: unknown,
  dependencies: EnrichmentDependencies
): Promise<{ data: T }> {
  const mutableUser: Record<string, unknown> = user;
  try {
    const ip = await dependencies.getClientIp();
    if (ip) {
      mutableUser.ip = ip;
    }

    const localeFromCookie = getCookieFromCtx(ctx, 'NEXT_LOCALE');
    const localeFromHeader = guessLocaleFromAcceptLanguage(
      getHeaderValue(ctx, 'accept-language')
    );
    const locale =
      (localeFromCookie || localeFromHeader || (await dependencies.getLocale())) ?? '';
    if (locale && typeof locale === 'string') {
      mutableUser.locale = locale.slice(0, 20);
    }

    if (user.utmSource) return { data: user };
    const raw = getCookieFromCtx(ctx, 'utm_source');
    if (!raw || typeof raw !== 'string') return { data: user };
    const sanitized = decodeURIComponent(raw)
      .trim()
      .replace(/[^\w\-.:]/g, '')
      .slice(0, 100);
    if (sanitized) {
      mutableUser.utmSource = sanitized;
    }
  } catch {
    // Preserve the existing best-effort behavior.
  }
  return { data: user };
}
