import Image from 'next/image';
import {
  Apple,
  BookOpen,
  ChevronRight,
  Compass,
  ExternalLink,
  Home,
  MessageCircle,
  Settings,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

import { getProfile } from '../data';
import { resolveAitalkSidebarUser } from '../lib/sidebar-user';
import { createAitalkServerClient } from '../supabase/server';

const navItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/lessons', label: 'Lessons', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: MessageCircle },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/me', label: 'Me', icon: Settings },
];

const IOS_APP_STORE_URL =
  'https://apps.apple.com/us/app/aitalk-ai-language-tutor/id6463466290';

export async function AitalkAppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const hideMobileNav = active === '/practice';
  const supabase = await createAitalkServerClient();
  const [profile, authResult] = await Promise.all([
    getProfile(supabase).catch(() => null),
    supabase.auth.getUser(),
  ]);
  const sidebarUser = resolveAitalkSidebarUser(
    profile,
    authResult.data.user ?? null
  );

  return (
    <div className="min-h-[100dvh] bg-[#f6fbf8] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-y-auto border-r border-emerald-950/10 bg-white/90 px-5 py-5 backdrop-blur md:flex md:flex-col dark:border-white/10 dark:bg-zinc-950/90">
        <Link href="/app" className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-2xl object-contain shadow-sm"
          />
          <div>
            <div className="text-lg font-black tracking-tight">AITalk</div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Speaking practice
            </div>
          </div>
        </Link>

        <nav className="mt-8 grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant={selected ? 'default' : 'ghost'}
                className={cn(
                  'h-12 justify-start rounded-xl text-[15px]',
                  selected
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'text-zinc-700 hover:bg-emerald-50 dark:text-zinc-200 dark:hover:bg-white/10'
                )}
              >
                <Link href={item.href}>
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-emerald-950/10 bg-emerald-50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Apple className="size-4" />
            iOS App
          </div>
          <p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
            Download AITalk on iPhone and keep lessons, progress and practice
            history synced with Web.
          </p>
          <Button
            asChild
            className="mt-3 h-10 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <a
              href={IOS_APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Download AITalk on the App Store"
            >
              Download on App Store
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>

        <Link
          href="/me"
          aria-label={`Open profile for ${sidebarUser.name}`}
          className="mt-3 flex min-h-20 items-center gap-3 rounded-2xl border border-emerald-950/10 bg-white p-3 shadow-sm transition-[border-color,background-color] hover:border-emerald-300 hover:bg-emerald-50/70 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/10"
        >
          <Avatar className="size-11 border border-emerald-950/10 bg-emerald-100 dark:border-white/10 dark:bg-emerald-500/20">
            {sidebarUser.avatarUrl ? (
              <AvatarImage
                src={sidebarUser.avatarUrl}
                alt={`${sidebarUser.name} profile photo`}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-emerald-100 text-sm font-black text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100">
              {sidebarUser.initials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black">
              {sidebarUser.name}
            </span>
            {sidebarUser.email ? (
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {sidebarUser.email}
              </span>
            ) : null}
            <span className="mt-0.5 block truncate text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {sidebarUser.learningSummary}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-zinc-400"
          />
        </Link>
      </aside>

      <main
        className={cn(hideMobileNav ? 'pb-0' : 'pb-24', 'md:ml-72 md:pb-0')}
      >
        {children}
      </main>

      {hideMobileNav ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-emerald-950/10 bg-white/95 px-2 py-2 backdrop-blur md:hidden dark:border-white/10 dark:bg-zinc-950/95">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.href;
            const isProfile = item.href === '/me';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold',
                  selected
                    ? 'bg-emerald-500 text-white'
                    : 'text-zinc-600 dark:text-zinc-300'
                )}
              >
                {isProfile ? (
                  <Avatar
                    className={cn(
                      'size-5 border',
                      selected
                        ? 'border-white/70'
                        : 'border-emerald-950/15 dark:border-white/20'
                    )}
                  >
                    {sidebarUser.avatarUrl ? (
                      <AvatarImage
                        src={sidebarUser.avatarUrl}
                        alt=""
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        'text-[9px] font-black',
                        selected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100'
                      )}
                    >
                      {sidebarUser.initials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className="size-5" />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
