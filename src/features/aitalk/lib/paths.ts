import { routing } from '@/core/i18n/config';

function splitPathAndSuffix(value: string) {
  const suffixIndex = value.search(/[?#]/);
  if (suffixIndex === -1) return [value || '/', ''] as const;
  return [
    value.slice(0, suffixIndex) || '/',
    value.slice(suffixIndex),
  ] as const;
}

export function stripLocale(pathname: string) {
  const [path, suffix] = splitPathAndSuffix(pathname);
  const parts = path.split('/');
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as any)) {
    const stripped = `/${parts.slice(2).join('/')}`;
    const normalized =
      stripped === '/' ? '/' : stripped.replace(/\/$/, '') || '/';
    return `${normalized}${suffix}`;
  }
  const normalized = path.replace(/\/$/, '') || '/';
  return `${normalized}${suffix}`;
}

export function getLocaleFromPath(pathname: string) {
  const locale = pathname.split('/')[1];
  return routing.locales.includes(locale as any)
    ? locale
    : routing.defaultLocale;
}

export function withLocale(path: string, locale: string) {
  const pathWithoutLocale = stripLocale(
    path.startsWith('/') ? path : `/${path}`
  );
  if (locale === routing.defaultLocale) {
    return pathWithoutLocale;
  }
  if (pathWithoutLocale === '/') {
    return `/${locale}`;
  }
  return `/${locale}${pathWithoutLocale}`;
}

export function normalizeAitalkRedirect(
  value: string | null | undefined,
  fallback = '/app'
) {
  const fallbackPath =
    fallback.startsWith('/') && !fallback.startsWith('//')
      ? stripLocale(fallback)
      : '/app';

  if (!value) return fallbackPath;

  let candidate = value.trim();
  if (!candidate) return fallbackPath;
  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) return fallbackPath;

  if (!candidate.startsWith('/')) {
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded.startsWith('/')) {
        candidate = decoded;
      }
    } catch {
      return fallbackPath;
    }
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallbackPath;
  }

  const normalized = stripLocale(candidate);
  const [pathname] = splitPathAndSuffix(normalized);
  if (isAitalkAuthPath(pathname)) return fallbackPath;

  return normalized;
}

export function isAitalkProtectedPath(pathWithoutLocale: string) {
  return [
    '/app',
    '/onboarding',
    '/lessons',
    '/practice',
    '/explore',
    '/me',
  ].some(
    (path) =>
      pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
  );
}

export function isAitalkAuthPath(pathWithoutLocale: string) {
  return (
    pathWithoutLocale === '/login' ||
    pathWithoutLocale === '/auth/callback' ||
    pathWithoutLocale.startsWith('/auth/callback/')
  );
}
