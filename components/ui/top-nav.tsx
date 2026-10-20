/**
 * Top Navigation Bar — desktop
 * Home / Trending / Library / Browse / My Requests
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { Icons } from './icons';

const tabs = [
  { href: '/', label: 'Home' },
  { href: '/trending', label: 'Trending' },
  { href: '/library', label: 'Library' },
  { href: '/browse', label: 'Browse' },
  { href: '/requests', label: 'My Requests' },
];

interface TopNavProps {
  guestName?: string | null;
  pendingCount?: number;
}

export function TopNav({ guestName, pendingCount = 0 }: TopNavProps) {
  const pathname = usePathname();
  const config = useAppConfig();
  const jellyfinUrl = config?.jellyfinUrl || 'https://streaming.surflix.my.id';

  return (
    <header className="sticky top-0 z-50 hidden bg-rq-bg md:block">
      <div className="rq-wrap flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Surflix Request Hub">
            <Image src="/logo-wordmark.png" alt="Surflix" width={102} height={28} priority className="h-7 w-auto" />
            <span className="rq-small text-rq-muted">Request Hub</span>
          </Link>

          <nav className="flex gap-1" aria-label="Main">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              const showBadge = tab.href === '/requests' && pendingCount > 0;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('tab', active && 'tab-active')}
                >
                  {tab.label}
                  {showBadge && (
                    <span className="ml-2 rounded-rq bg-rq-accent px-1.5 text-xs font-semibold text-rq-bg">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {guestName ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-rq bg-rq-raised text-sm font-medium">
                {guestName.charAt(0).toUpperCase()}
              </div>
              <span className="rq-text text-rq-muted">{guestName}</span>
            </div>
          ) : (
            <Link href="/requests" className="tab">Sign in</Link>
          )}
          <a
            href={jellyfinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary !min-h-10 gap-2"
          >
            <Icons.Play className="h-3.5 w-3.5" />
            Watch on Surflix
          </a>
        </div>
      </div>
    </header>
  );
}
