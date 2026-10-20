/**
 * Bottom Tab Bar — mobile only
 * 5 tabs: Home / Trending / Library / Browse / Requests
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icons } from './icons';

const tabs = [
  { href: '/', label: 'Home', icon: Icons.Sparkles },
  { href: '/trending', label: 'Trending', icon: Icons.Flame },
  { href: '/library', label: 'Library', icon: Icons.Library },
  { href: '/browse', label: 'Browse', icon: Icons.Search },
  { href: '/requests', label: 'Requests', icon: Icons.ListChecks },
];

interface Props {
  pendingCount?: number;
}

export function BottomTabBar({ pendingCount = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 bg-rq-surface md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}
    >
      <div className="grid grid-cols-5 gap-1 px-3 py-1.5">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          const showBadge = tab.href === '/requests' && pendingCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-rq transition-colors',
                active ? 'bg-rq-raised text-white' : 'text-rq-muted'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-rq-accent')} />
              <span className="text-xs font-medium">{tab.label}</span>
              {showBadge && (
                <span className="absolute right-2 top-1 min-w-4 rounded-rq bg-rq-accent px-1 text-center text-xs font-semibold text-rq-bg">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
