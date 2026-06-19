import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { stripLocale, withLocale } from '@/features/aitalk/lib/paths';
import { createAitalkServerClient } from '@/features/aitalk/supabase/server';

export default async function AitalkProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const headerStore = await headers();
  const supabase = await createAitalkServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const pathname = headerStore.get('x-pathname') || '/app';
    const target = stripLocale(pathname);
    redirect(
      `${withLocale('/login', locale)}?redirect=${encodeURIComponent(target)}`
    );
  }

  return children;
}
