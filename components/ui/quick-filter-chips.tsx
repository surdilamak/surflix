/**
 * Quick Filter Tiles — pintasan jenis, era, dan genre
 * Klik ubin → /browse dengan filter yang sudah terpasang
 */
'use client';

import Link from 'next/link';
import { Icons, IconName } from './icons';

interface FilterTile {
  label: string;
  icon: IconName;
  href: string;
}

const CATEGORIES: FilterTile[] = [
  { label: 'Movies', icon: 'Film', href: '/browse?type=movie' },
  { label: 'Series', icon: 'Tv', href: '/browse?type=tv' },
  { label: 'New Releases', icon: 'Sparkles', href: '/browse?year=2024,2025,2026' },
  { label: 'Action', icon: 'Swords', href: '/browse?genre=28' },
  { label: 'Drama', icon: 'Drama', href: '/browse?genre=18' },
  { label: 'Sci-Fi', icon: 'Rocket', href: '/browse?genre=878' },
  { label: 'Comedy', icon: 'Laugh', href: '/browse?genre=35' },
  { label: 'Horror', icon: 'Ghost', href: '/browse?genre=27' },
  { label: 'Anime', icon: 'Clapperboard', href: '/browse?genre=16&type=tv' },
];

export function QuickFilterChips() {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-9">
      {CATEGORIES.map((cat) => {
        const Icon = Icons[cat.icon];
        return (
          <Link
            key={cat.label}
            href={cat.href}
            className="rq-tile rq-tile-link flex min-h-[88px] flex-col justify-between p-3"
          >
            <Icon className="h-5 w-5 text-rq-accent" />
            <span className="rq-small font-medium text-white">{cat.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
