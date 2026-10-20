/**
 * Tautan Request Hub (desktop) — duduk di dalam PortalBar, satu baris dengan logo dan pill situs.
 * Home / Trending / Library / Browse / My Requests (di telepon diganti BottomTabBar).
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/components/connections/lang-provider';

const tabs = [
  { href: '/', key: 'hub.nav.home' },
  { href: '/trending', key: 'hub.nav.trending' },
  { href: '/library', key: 'hub.nav.library' },
  { href: '/browse', key: 'hub.nav.browse' },
  { href: '/requests', key: 'hub.nav.requests' },
];

interface TopNavProps {
  pendingCount?: number;
}

export function TopNav({ pendingCount = 0 }: TopNavProps) {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <nav className="pb-nav pb-nav--long" aria-label={t('hub.name')}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const showBadge = tab.href === '/requests' && pendingCount > 0;
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}>
            {t(tab.key)}
            {showBadge && (
              <span className="ml-2 rounded-rq bg-rq-accent px-1.5 text-xs font-semibold text-rq-bg">{pendingCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
