'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { signIn } from '@/core/auth/client';
import { defaultLocale } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { Button as ButtonType } from '@/shared/types/blocks/common';

export function SocialProviders({
  configs,
  callbackUrl,
  loading,
  setLoading,
}: {
  configs: Record<string, string>;
  callbackUrl: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();

  const { setIsShowSignModal } = useAppContext();
  const popupRef = useRef<Window | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (callbackUrl) {
    if (
      locale !== defaultLocale &&
      callbackUrl.startsWith('/') &&
      !callbackUrl.startsWith(`/${locale}`)
    ) {
      callbackUrl = `/${locale}${callbackUrl}`;
    }
  }

  const cleanupPopup = useCallback(() => {
    if (popupTimerRef.current) {
      clearInterval(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    popupRef.current = null;
  }, []);

  const handleAuthCallback = useCallback(() => {
    cleanupPopup();
    setIsShowSignModal(false);
    // Hard reload the page so the browser picks up the new session cookie
    window.location.reload();
  }, [cleanupPopup, setIsShowSignModal]);

  // Listen for localStorage event from the popup callback page
  // (works even when COOP blocks window.opener / postMessage)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'auth-callback-success') {
        handleAuthCallback();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [handleAuthCallback]);

  const handleSignIn = async ({ provider }: { provider: string }) => {
    setLoading(true);

    // Open popup to the intermediate page that triggers signIn.social()
    const popupPath =
      locale !== defaultLocale
        ? `/${locale}/auth-popup?provider=${provider}`
        : `/auth-popup?provider=${provider}`;
    const popupUrl = `${window.location.origin}${popupPath}`;

    // Open centered popup window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    if (!popup) {
      // Popup blocked - fall back to redirect
      toast.error('Popup blocked. Trying redirect...');
      setLoading(false);
      await signIn.social(
        { provider, callbackURL: callbackUrl },
        {
          onRequest: () => setLoading(true),
          onSuccess: () => setIsShowSignModal(false),
          onError: (e: any) => {
            toast.error(e?.error?.message || 'Sign in failed');
            setLoading(false);
          },
        }
      );
      return;
    }

    popupRef.current = popup;

    // Poll to detect if popup was closed manually (without completing auth)
    popupTimerRef.current = setInterval(() => {
      try {
        if (popup.closed) {
          cleanupPopup();
          setLoading(false);
        }
      } catch {
        // COOP may block access to popup.closed; ignore and keep polling
      }
    }, 500);
  };

  const providers: ButtonType[] = [];

  if (configs.google_auth_enabled === 'true') {
    providers.push({
      name: 'google',
      title: t('google_sign_in_title'),
      icon: <GoogleIcon className="size-4" />,
      onClick: () => handleSignIn({ provider: 'google' }),
    });
  }

  if (configs.github_auth_enabled === 'true') {
    providers.push({
      name: 'github',
      title: t('github_sign_in_title'),
      icon: <GitHubIcon className="size-4" />,
      onClick: () => handleSignIn({ provider: 'github' }),
    });
  }

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2',
        'flex-col justify-between'
      )}
    >
      {providers.map((provider) => (
        <Button
          key={provider.name}
          type="button"
          variant="outline"
          className={cn('w-full gap-2')}
          disabled={loading}
          onClick={provider.onClick}
        >
          {provider.icon}
          <h3>{provider.title}</h3>
        </Button>
      ))}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      role="img"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.35 11.1H12v2.9h5.35c-.23 1.5-1.62 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.84 0 3.07.78 3.78 1.46l2.57-2.48C16.7 3.94 14.56 3 12 3 6.76 3 2.5 7.26 2.5 12.5S6.76 22 12 22c6.92 0 9.2-4.86 9.2-9.1 0-.61-.06-1.08-.15-1.8h.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      role="img"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.2-3.37-1.2-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.82.09-.64.35-1.08.64-1.33-2.22-.25-4.55-1.1-4.55-4.93 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.53 9.53 0 0 1 12 7c.85 0 1.7.11 2.5.33 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
