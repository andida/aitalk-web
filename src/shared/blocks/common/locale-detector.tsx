'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useLocale } from 'next-intl';

import { usePathname, useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { localeNames, locales } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { getTimestamp } from '@/shared/lib/time';

import { readBannerCache, useBannerBrowserSnapshot, writeBannerCache } from './banner-state';
import { useBannerOffset } from './use-banner-offset';

const DISMISSED_KEY = 'locale-suggestion-dismissed';
const DISMISSED_EXPIRY_DAYS = 1; // Expiry in days
const PREFERRED_LOCALE_KEY = 'locale';

type LocaleSnapshot = {
  browserLocale: string | null;
  dismissed: string | null;
  preferredLocale: string | null;
};

function sameLocaleSnapshot(a: LocaleSnapshot, b: LocaleSnapshot) {
  return a.browserLocale === b.browserLocale && a.dismissed === b.dismissed &&
    a.preferredLocale === b.preferredLocale;
}

function readLocaleSnapshot(): LocaleSnapshot {
  const browserLang = navigator.language ||
    (navigator as Navigator & { userLanguage?: string }).userLanguage;
  const language = browserLang?.split('-')[0].toLowerCase();
  const detected = language && locales.includes(language) ? language : null;
  return {
    browserLocale: detected,
    dismissed: readBannerCache(DISMISSED_KEY),
    preferredLocale: readBannerCache(PREFERRED_LOCALE_KEY),
  };
}

export function LocaleDetector() {
  return envConfigs.locale_detect_enabled === 'true' ? (
    <EnabledLocaleDetector />
  ) : null;
}

function EnabledLocaleDetector() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const snapshot = useBannerBrowserSnapshot(readLocaleSnapshot, sameLocaleSnapshot);
  const [hidden, setHidden] = useState(false);
  const hasCheckedRef = useRef(false);
  const { browserLocale = null, dismissed = null, preferredLocale = null } = snapshot ?? {};
  const showBanner = snapshot !== null && !hidden && Boolean(browserLocale) &&
    browserLocale !== currentLocale && !dismissed && !preferredLocale;
  const { bannerRef, spacerRef } = useBannerOffset(showBanner);

  const replaceLocale = useCallback((locale: string) => {
    const query = searchParams?.toString?.() ?? '';
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale });
  }, [router, pathname, searchParams]);

  useEffect(() => {
    // Only the first committed preference check may auto-navigate. Subsequent
    // locale changes can be manual; do not redirect the user back to a preference.
    if (snapshot === null || hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    if (preferredLocale && preferredLocale !== currentLocale && locales.includes(preferredLocale)) {
      replaceLocale(preferredLocale);
    }
  }, [snapshot, preferredLocale, currentLocale, replaceLocale]);

  const handleSwitch = () => {
    if (!browserLocale) return;
    replaceLocale(browserLocale);
    writeBannerCache(PREFERRED_LOCALE_KEY, browserLocale);
    setHidden(true);
  };

  const handleDismiss = () => {
    const expiresAt = getTimestamp() + DISMISSED_EXPIRY_DAYS * 24 * 60 * 60;
    writeBannerCache(DISMISSED_KEY, 'true', expiresAt);
    setHidden(true);
  };

  const targetLocaleName =
    localeNames[browserLocale as keyof typeof localeNames] || browserLocale;

  if (!showBanner || !browserLocale) {
    return null;
  }

  return (
    <>
      <div
        ref={bannerRef}
        className="from-primary to-primary/80 text-primary-foreground fixed top-0 right-0 left-0 z-[51] hidden bg-gradient-to-r shadow-lg md:block"
      >
        <div className="container py-2.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <span className="text-sm">
                {browserLocale === 'zh'
                  ? `检测到浏览器语言是: ${targetLocaleName}，是否切换？`
                  : `We detected your browser language is ${targetLocaleName}. Switch to it?`}
              </span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button
                onClick={handleSwitch}
                variant="secondary"
                size="sm"
                className="bg-background text-xs"
              >
                {browserLocale === 'zh' ? '切换到中文' : 'Switch'}
              </Button>
              <button
                onClick={handleDismiss}
                type="button"
                className="bg-primary/10 flex-shrink-0 rounded p-1 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        ref={spacerRef}
        className="pointer-events-none"
      />
    </>
  );
}
