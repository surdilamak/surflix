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
import { useLang } from '@/components/connections/lang-provider';

interface PosterCardProps {
  item: JellyseerrMediaItem;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progress?: number; // 0-100, kalau ada lagi downloading
}

export function PosterCard({ item, onClick, size = 'md', showProgress, progress }: PosterCardProps) {
  const { t } = useLang();
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
        'group text-left transition-opacity',
        isDimmed && 'opacity-60 hover:opacity-90'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-rq bg-rq-surface transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]',
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
          <div className="flex h-full w-full items-center justify-center bg-rq-surface">
            <Icons.Film className="h-8 w-8 text-white/15" />
          </div>
        )}

        {/* Status badge top-right */}
        {status.variant === 'available' && (
          <div className="absolute left-2 top-2 badge-available">
            <Icons.Check className="h-2.5 w-2.5" />
            <span>{t('hub.poster.inSurflix')}</span>
          </div>
        )}
        {status.variant === 'pending' && (
          <div className="absolute left-2 top-2 badge-pending">
            <Icons.Clock className="h-2.5 w-2.5" />
            <span>{t('hub.poster.pending')}</span>
          </div>
        )}

        {/* Progress overlay (untuk downloading) */}
        {showProgress && progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 bg-rq-bg/90 p-2">
            <div className="badge-processing mb-1.5">
              <Icons.Download className="h-2.5 w-2.5" />
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-rq bg-white/20">
              <div
                className="h-full bg-rq-accent transition-[width]"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Request hint (bottom-right, subtle) */}
        {status.variant === 'none' && (
          <div className="absolute bottom-2 right-2 hidden items-center gap-1 rounded-rq bg-rq-accent px-2 py-1 text-xs font-medium text-rq-bg group-hover:flex">
            <Icons.Plus className="h-3 w-3" />
            <span>{t('hub.poster.request')}</span>
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className="rq-small line-clamp-1 font-medium text-white">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-rq-muted">
          {year}
          {item.mediaType === 'tv' && ` · ${t('hub.poster.series')}`}
          {rating && (
              <>
                {' · '}
                <Icons.Star className="-mt-0.5 inline h-3 w-3 fill-current" /> {rating}
              </>
            )}
        </p>
      </div>
    </button>
  );
}
