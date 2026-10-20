/**
 * Quick Filter Tiles — pintasan jenis, era, dan genre
 * Klik ubin → /browse dengan filter yang sudah terpasang
 */
'use client';

import Link from 'next/link';
import { Icons, IconName } from './icons';
import { useLang } from '@/components/connections/lang-provider';

interface FilterTile {
  key: string;
  icon: IconName;
  href: string;
}

const CATEGORIES: FilterTile[] = [
  { key: 'movies', icon: 'Film', href: '/browse?type=movie' },
  { key: 'series', icon: 'Tv', href: '/browse?type=tv' },
  { key: 'new', icon: 'Sparkles', href: '/browse?year=2024,2025,2026' },
  { key: 'action', icon: 'Swords', href: '/browse?genre=28' },
  { key: 'drama', icon: 'Drama', href: '/browse?genre=18' },
  { key: 'scifi', icon: 'Rocket', href: '/browse?genre=878' },
  { key: 'comedy', icon: 'Laugh', href: '/browse?genre=35' },
  { key: 'horror', icon: 'Ghost', href: '/browse?genre=27' },
  { key: 'anime', icon: 'Clapperboard', href: '/browse?genre=16&type=tv' },
];

export function QuickFilterChips() {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-9">
      {CATEGORIES.map((cat) => {
        const Icon = Icons[cat.icon];
        return (
          <Link
            key={cat.key}
            href={cat.href}
            className="rq-tile rq-tile-link flex min-h-[88px] flex-col justify-between p-3"
          >
            <Icon className="h-5 w-5 text-rq-accent" />
            <span className="rq-small font-medium text-white">{t(`hub.cat.${cat.key}`)}</span>
          </Link>
        );
      })}
    </div>
  );
}
