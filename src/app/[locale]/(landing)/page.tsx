import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  AitalkLanding,
  type AitalkLandingCopy,
} from '@/features/aitalk/ui/aitalk-landing';

export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const copy = t.raw('aitalk') as AitalkLandingCopy;

  return <AitalkLanding copy={copy} />;
}
