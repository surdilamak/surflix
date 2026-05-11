/**
 * Poster Card — komponen utama buat nampilin film/series
 * Auto handle status badge (In Library, Downloading, Pending, dll)
 * Klik untuk buka detail modal.
 */
'use client';

import Image from 'next/image';
import { cn, tmdbImage, getYear, jellyseerrStatusLabel } from '@/lib/utils';
import { Icons } from './icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';

interface PosterCardProps {
  item: JellyseerrMediaItem;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progress?: number; // 0-100, kalau ada lagi downloading
}

export function PosterCard({ item, onClick, size = 'md', showProgress, progress }: PosterCardProps) {
  const title = item.title || item.name || 'Untitled';
  const date = item.releaseDate || item.firstAirDate;
  const year = getYear(date);
  const poster = tmdbImage(item.posterPath, 'w342');
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : null;
  const status = jellyseerrStatusLabel(item.mediaInfo?.status);

  const isDimmed = status.variant === 'available' || status.variant === 'processing';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group text-left transition-all',
        isDimmed && 'opacity-60 hover:opacity-90'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-ios bg-bg-elevated transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]',
          'aspect-[2/3]'
        )}
      >
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-surface to-bg-elevated">
            <Icons.Film className="h-8 w-8 text-white/15" />
          </div>
        )}

        {/* Status badge top-right */}
        {status.variant === 'available' && (
          <div className="absolute right-1.5 top-1.5 badge-available">
            <Icons.Check className="h-2.5 w-2.5" />
            <span>In Surflix</span>
          </div>
        )}
        {status.variant === 'pending' && (
          <div className="absolute right-1.5 top-1.5 badge-pending">
            <Icons.Clock className="h-2.5 w-2.5" />
            <span>Pending</span>
          </div>
        )}

        {/* Progress overlay (untuk downloading) */}
        {showProgress && progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
            <div className="badge-processing mb-1.5">
              <Icons.Download className="h-2.5 w-2.5" />
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-0.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-ios-blue transition-all"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Request hint (bottom-right, subtle) */}
        {status.variant === 'none' && (
          <div className="absolute bottom-2 right-2 hidden items-center gap-1 rounded-full border border-white/15 bg-black/70 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-ios group-hover:flex">
            <Icons.Plus className="h-3 w-3" />
            <span>Request</span>
          </div>
        )}
      </div>

      <div className="mt-2 px-0.5">
        <p className="line-clamp-1 text-[13px] font-medium tracking-tight text-white">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-white/50">
          {year}
          {item.mediaType === 'tv' && ' · Series'}
          {rating && ` · ★ ${rating}`}
        </p>
      </div>
    </button>
  );
}
