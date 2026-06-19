import type { MetadataRoute } from 'next';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';

const indexablePages = [
  {
    path: '/',
    changeFrequency: 'weekly' as const,
    priority: 1,
  },
  {
    path: '/pricing',
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  },
];

function localizedUrl(path: string, locale: string) {
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`;

  if (path === '/') {
    return `${envConfigs.app_url}${localePrefix || '/'}`;
  }

  return `${envConfigs.app_url}${localePrefix}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return indexablePages.flatMap((page) =>
    locales.map((locale) => ({
      url: localizedUrl(page.path, locale),
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))
  );
}
