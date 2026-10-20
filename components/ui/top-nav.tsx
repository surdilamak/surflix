/**
 * Top Navigation Bar — desktop
 * Home / Trending / Library / Browse / My Requests
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/connections/lang-provider';

const tabs = [
  { href: '/', key: 'hub.nav.home' },
  { href: '/trending', key: 'hub.nav.trending' },
  { href: '/library', key: 'hub.nav.library' },
  { href: '/browse', key: 'hub.nav.browse' },
  { href: '/requests', key: 'hub.nav.requests' },
];

interface TopNavProps {
  guestName?: string | null;
  pendingCount?: number;
}

export function TopNav({ guestName, pendingCount = 0 }: TopNavProps) {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <header className="sticky top-0 z-50 hidden bg-rq-bg md:block">
      <div className="rq-wrap flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          <nav className="-ml-3 flex gap-1" aria-label={t('hub.name')}>
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
                  {t(tab.key)}
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
            <Link href="/requests" className="tab">{t('hub.nav.signIn')}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
