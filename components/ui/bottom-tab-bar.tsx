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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-black/85 backdrop-blur-ios md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}
    >
      <div className="grid grid-cols-5 px-1 pt-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          const showBadge = tab.href === '/requests' && pendingCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 py-1.5 transition-colors',
                active ? 'text-surflix-500' : 'text-white/50'
              )}
            >
              <Icon className="h-[20px] w-[20px]" />
              <span className="text-[9px] font-medium">{tab.label}</span>
              {showBadge && (
                <span className="absolute right-[calc(50%-16px)] top-0.5 min-w-[14px] rounded-full bg-surflix-500 px-1 py-px text-center text-[9px] font-semibold text-white">
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
