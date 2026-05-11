/**
 * Hero Banner — featured/trending #1 dengan backdrop image
 * Apple TV+ / Plex style
 */
'use client';

import Image from 'next/image';
import { tmdbImage, getYear } from '@/lib/utils';
import { Icons } from './icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';

interface HeroProps {
  item: JellyseerrMediaItem;
  rank?: number;
  onRequest?: () => void;
  onDetail?: () => void;
}

export function Hero({ item, rank = 1, onRequest, onDetail }: HeroProps) {
  const title = item.title || item.name || 'Untitled';
  const date = item.releaseDate || item.firstAirDate;
  const year = getYear(date);
  const backdrop = tmdbImage(item.backdropPath, 'w780');
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : null;
  const mediaTypeLabel = item.mediaType === 'movie' ? 'Movie' : 'Series';

  return (
    <div className="relative h-[260px] w-full overflow-hidden md:h-[320px]">
      {/* Backdrop */}
      {backdrop ? (
        <Image
          src={backdrop}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-red-900/40" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

      {/* Rank badge */}
      <div className="absolute left-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-ios">
        <Icons.Flame className="h-3 w-3 text-ios-orange" />
        <span>Trending #{rank}</span>
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-7">
        <div className="max-w-[60%]">
          <h1 className="mb-1 text-2xl font-semibold leading-tight tracking-tighter text-white md:text-3xl">
            {title}
          </h1>
          <p className="mb-4 text-xs text-white/65 md:text-[13px]">
            {year} · {mediaTypeLabel}
            {rating && ` · ★ ${rating}`}
          </p>
          <div className="flex gap-2">
            <button onClick={onRequest} className="btn-primary">
              <span className="flex items-center gap-1.5">
                <Icons.Plus className="h-4 w-4" />
                Request
              </span>
            </button>
            <button onClick={onDetail} className="btn-secondary">
              <span className="flex items-center gap-1.5">
                <Icons.Info className="h-4 w-4" />
                Details
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
