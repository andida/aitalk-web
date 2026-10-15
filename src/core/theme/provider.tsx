'use client';

import { ReactNode, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { envConfigs } from '@/config';

import { themeBootstrap } from './bootstrap';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    if (typeof document !== 'undefined' && locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          // Keep this as source text: serializing a function lets server bundlers
          // inject helpers that are absent from the browser's inline script.
          __html: themeBootstrap(envConfigs.appearance),
        }}
      />
      <NextThemesProvider
        scriptProps={{ type: 'application/x-aitalk-theme' }}
        attribute="class"
        defaultTheme={envConfigs.appearance}
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </>
  );
}
