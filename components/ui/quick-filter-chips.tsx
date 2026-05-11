/**
 * Quick Filter Chips — Persona-based shortcuts
 * Mix genre + era + media type
 * Klik chip → redirect ke /browse dengan filter pre-applied
 */
'use client';

import Link from 'next/link';
import { Icons } from './icons';

interface FilterChip {
  label: string;
  icon: keyof typeof Icons;
  href: string;
  emoji?: string;
}

const CATEGORIES: FilterChip[] = [
  // Media Type
  { label: 'Movies', icon: 'Film', href: '/browse?type=movie' },
  { label: 'Series', icon: 'Tv', href: '/browse?type=tv' },
  // Era
  { label: 'New Releases', icon: 'Sparkles', href: '/browse?year=2024,2025,2026' },
  // Popular Genres (TMDB genre IDs)
  { label: 'Action', icon: 'Flame', href: '/browse?genre=28', emoji: '💥' },
  { label: 'Drama', icon: 'Film', href: '/browse?genre=18', emoji: '🎭' },
  { label: 'Sci-Fi', icon: 'Sparkles', href: '/browse?genre=878', emoji: '🚀' },
  { label: 'Comedy', icon: 'Film', href: '/browse?genre=35', emoji: '😄' },
  { label: 'Horror', icon: 'Film', href: '/browse?genre=27', emoji: '👻' },
  { label: 'Anime', icon: 'Tv', href: '/browse?genre=16&type=tv', emoji: '🎌' },
];

export function QuickFilterChips() {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const Icon = Icons[cat.icon];
        return (
          <Link
            key={cat.label}
            href={cat.href}
            className="group flex items-center gap-2.5 rounded-ios-lg border border-white/[0.08] bg-white/[0.03] px-3 py-3 transition-all hover:border-white/15 hover:bg-white/[0.06]"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-base transition-transform group-hover:scale-110">
              {cat.emoji || <Icon className="h-4 w-4 text-white/70" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium tracking-tight text-white">{cat.label}</p>
            </div>
            <Icons.ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
          </Link>
        );
      })}
    </div>
  );
}
