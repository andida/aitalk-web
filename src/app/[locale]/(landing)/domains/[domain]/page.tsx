import {
  DomainDetailPage,
  type DomainDetailCopy,
} from '@/features/siterise/domain-detail-page';
import { normalizeDomain } from '@/features/traffic/domain';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import {
  getDomainDetailView,
  type DomainDetailView,
} from '@/shared/models/siterise';
import { getUserInfo } from '@/shared/models/user';

export const revalidate = 300;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.domains.metadata',
  canonicalUrl: '/domains',
});

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; domain: string }>;
}) {
  const { locale, domain } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.domains');
  const copy = t.raw('page') as DomainDetailCopy;
  const normalized = safeNormalizeDomain(domain);
  const user = await getOptionalUser();
  const detail = normalized
    ? await getSafeDomainDetailView({
        rootDomain: normalized.rootDomain,
        isAuthenticated: Boolean(user),
      })
    : null;

  return <DomainDetailPage copy={copy} detail={detail} />;
}

function safeNormalizeDomain(domain: string) {
  try {
    return normalizeDomain(decodeURIComponent(domain));
  } catch {
    return null;
  }
}

async function getOptionalUser() {
  try {
    return await getUserInfo();
  } catch {
    return null;
  }
}

async function getSafeDomainDetailView({
  rootDomain,
  isAuthenticated,
}: {
  rootDomain: string;
  isAuthenticated: boolean;
}): Promise<DomainDetailView | null> {
  try {
    return await getDomainDetailView({
      rootDomain,
      isAuthenticated,
    });
  } catch (error) {
    console.error('load domain detail failed:', error);
    return null;
  }
}
