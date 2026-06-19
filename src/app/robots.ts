import { MetadataRoute } from 'next';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';

export default function robots(): MetadataRoute.Robots {
  const appUrl = envConfigs.app_url;
  const privateRoutes = ['/settings/*', '/activity/*', '/admin/*', '/api/*'];
  const localizedPrivatePaths = locales.flatMap((locale) => {
    if (locale === defaultLocale) {
      return privateRoutes;
    }

    return privateRoutes.map((path) =>
      path.startsWith('/api/') ? path : `/${locale}${path}`
    );
  });

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/*?*q=', ...localizedPrivatePaths],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
