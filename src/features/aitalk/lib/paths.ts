import { routing } from '@/core/i18n/config';

export function stripLocale(pathname: string) {
  const parts = pathname.split('/');
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as any)) {
    const stripped = `/${parts.slice(2).join('/')}`;
    return stripped === '/' ? '/' : stripped.replace(/\/$/, '') || '/';
  }
  return pathname.replace(/\/$/, '') || '/';
}

export function getLocaleFromPath(pathname: string) {
  const locale = pathname.split('/')[1];
  return routing.locales.includes(locale as any) ? locale : routing.defaultLocale;
}

export function withLocale(path: string, locale: string) {
  if (locale === routing.defaultLocale) {
    return path;
  }
  return `/${locale}${path}`;
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
