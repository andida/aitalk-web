'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { getTimestamp } from '@/shared/lib/time';
import { cn } from '@/shared/lib/utils';

import { readBannerCache, useBannerBrowserSnapshot, writeBannerCache } from './banner-state';
import { useBannerOffset } from './use-banner-offset';

type TopBannerLinkTarget = '_self' | '_blank';

export type TopBannerProps = {
  enabled?: boolean;
  /**
   * Used to build the dismiss cache key. Change it when you change the banner.
   */
  id?: string;
  /**
   * Banner main text.
   */
  text: ReactNode;
  /**
   * CTA button text. When omitted, the button is hidden.
   */
  buttonText?: string;
  /**
   * CTA link. When provided, clicking the button navigates to this URL.
   */
  href?: string;
  /**
   * Open the link in a new tab. Defaults to false.
   */
  target?: TopBannerLinkTarget;
  /**
   * Whether the banner can be dismissed. Defaults to true.
   */
  closable?: boolean;
  /**
   * Remember dismiss state in cache. Defaults to true.
   */
  rememberDismiss?: boolean;
  /**
   * Dismiss expiry in days. Defaults to 7.
   */
  dismissedExpiryDays?: number;
  /**
   * Extra class names for the banner wrapper.
   */
  className?: string;
  /**
   * Optional callback when user clicks the CTA and no `href` is provided.
   */
  onAction?: () => void;
};

function isExternalHref(href: string) {
  return (
    /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href)
  );
}

export function TopBanner({
  enabled = true,
  id = 'default',
  text,
  buttonText,
  href,
  target = '_self',
  closable = true,
  rememberDismiss = true,
  dismissedExpiryDays = 7,
  className,
  onAction,
}: TopBannerProps) {
  const dismissKey = `top-banner-dismissed:${id}`;
  const readDismissal = useCallback(
    () => rememberDismiss && readBannerCache(dismissKey) ? 'dismissed' : 'visible',
    [dismissKey, rememberDismiss]
  );
  const cachedDismissal = useBannerBrowserSnapshot(readDismissal);
  const [dismissedKeys, setDismissedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const showBanner = enabled && cachedDismissal === 'visible' && !dismissedKeys.has(dismissKey);
  const { bannerRef, spacerRef } = useBannerOffset(showBanner);

  const handleDismiss = () => {
    setDismissedKeys((previous) => new Set(previous).add(dismissKey));
    if (rememberDismiss) {
      const expiresAt = getTimestamp() + dismissedExpiryDays * 24 * 60 * 60;
      writeBannerCache(dismissKey, 'true', expiresAt);
    }
  };

  if (!showBanner) return null;

  const showButton =
    Boolean(buttonText) && (Boolean(href) || Boolean(onAction));

  return (
    <>
      <div
        ref={bannerRef}
        className={cn(
          'from-primary to-primary text-primary-foreground fixed top-0 right-0 left-0 z-[51] hidden min-h-12 bg-gradient-to-r py-1 shadow-lg md:block',
          className
        )}
      >
        <div className="container py-2.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center justify-center gap-3">
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: String(text ?? '') }}
              />
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {showButton ? (
                href ? (
                  isExternalHref(href) ? (
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="bg-background text-xs"
                    >
                      <a
                        href={href}
                        target={target}
                        rel={
                          target === '_blank'
                            ? 'noreferrer noopener'
                            : undefined
                        }
                      >
                        {buttonText}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="bg-background text-xs"
                    >
                      <Link href={href}>{buttonText}</Link>
                    </Button>
                  )
                ) : (
                  <Button
                    onClick={onAction}
                    variant="secondary"
                    size="sm"
                    className="bg-background text-xs"
                  >
                    {buttonText}
                  </Button>
                )
              ) : null}

              {closable ? (
                <button
                  onClick={handleDismiss}
                  type="button"
                  className="bg-primary/10 flex-shrink-0 rounded p-1 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
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
