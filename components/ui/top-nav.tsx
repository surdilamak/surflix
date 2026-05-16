/**
 * Top Navigation Bar — desktop
 * New order: Home / Trending / Library / Browse / My Requests
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { Icons } from './icons';

const tabs = [
  { href: '/', label: 'Home', icon: Icons.Sparkles },
  { href: '/trending', label: 'Trending', icon: Icons.Flame },
  { href: '/library', label: 'Library', icon: Icons.Library },
  { href: '/browse', label: 'Browse', icon: Icons.Search },
  { href: '/requests', label: 'My Requests', icon: Icons.ListChecks },
];

interface TopNavProps {
  guestName?: string | null;
  pendingCount?: number;
}

export function TopNav({ guestName, pendingCount = 0 }: TopNavProps) {
  const pathname = usePathname();
  const config = useAppConfig();
  const jellyfinUrl = config?.jellyfinUrl || 'https://www.surflix.my.id';

  return (
    <header className="sticky top-0 z-50 hidden border-b border-white/[0.08] backdrop-blur-ios md:block">
      <div className="bg-black/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex flex-col items-start leading-none">
              <Image
                src="/logo-wordmark.png"
                alt="Surflix"
                width={102}
                height={28}
                priority
                className="h-7 w-auto"
              />
              <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-white/40">
                Request Hub
              </span>
            </Link>

            <nav className="flex gap-0.5">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                const Icon = tab.icon;
                const showBadge = tab.href === '/requests' && pendingCount > 0;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn('tab', active && 'tab-active')}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {showBadge && (
                        <span className="rounded-full bg-surflix-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Cross-link: Watch on Surflix → Jellyfin. Orange (ios-orange) to
                visually pair with the landing page's orange Watch card. */}
            <a
              href={jellyfinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-ios-orange/30 bg-ios-orange/10 px-3 py-1.5 text-xs font-medium text-ios-orange transition-colors hover:bg-ios-orange/20"
            >
              <Icons.Play className="h-3 w-3" />
              Watch on Surflix
            </a>

            {guestName ? (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ios-orange to-surflix-500 text-xs font-medium text-white">
                  {guestName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-sm text-white/70 sm:inline">{guestName}</span>
              </div>
            ) : (
              <Link
                href="/requests"
                className="text-sm font-medium text-white/70 hover:text-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
