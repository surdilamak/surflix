/**
 * Hero Banner — featured/trending #1 dengan backdrop image
 * Apple TV+ / Plex style
 */
'use client';

import Image from 'next/image';
import { tmdbImage, getYear } from '@/lib/utils';
import { Icons } from './icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { useLang } from '@/components/connections/lang-provider';

interface HeroProps {
  item: JellyseerrMediaItem;
  rank?: number;
  onRequest?: () => void;
  onDetail?: () => void;
}

export function Hero({ item, rank = 1, onRequest, onDetail }: HeroProps) {
  const { t } = useLang();
  const title = item.title || item.name || 'Untitled';
  const date = item.releaseDate || item.firstAirDate;
  const year = getYear(date);
  const backdrop = tmdbImage(item.backdropPath, 'original');
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : null;
  const mediaTypeLabel = item.mediaType === 'movie' ? t('hub.type.movie') : t('hub.poster.series');

  return (
    <div className="relative h-[240px] w-full overflow-hidden rounded-rq md:h-[280px]">
      {/* Backdrop */}
      {backdrop ? (
        <Image
          src={backdrop}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 1232px"
        />
      ) : (
        <div className="h-full w-full bg-rq-surface" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-rq-bg/60" />

      {/* Rank badge */}
      <div className="absolute left-4 top-4 z-10 md:left-6 md:top-6 flex items-center gap-1.5 rounded-rq bg-rq-raised px-3 py-1 rq-small font-medium text-white">
        <Icons.Flame className="h-3 w-3 text-rq-accent" />
        <span>{t('hub.trending.rank', { n: rank })}</span>
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-6">
        <div className="max-w-xl">
          <h1 className="mb-1 rq-title text-white">
            {title}
          </h1>
          <p className="rq-small mb-4 text-white/80">
            {year} · {mediaTypeLabel}
            {rating && (
              <>
                {' · '}
                <Icons.Star className="-mt-0.5 inline h-3 w-3 fill-current" /> {rating}
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button onClick={onRequest} className="rq-btn rq-btn-primary">
              <span className="flex items-center gap-1.5">
                <Icons.Plus className="h-4 w-4" />
                {t('hub.poster.request')}
              </span>
            </button>
            <button onClick={onDetail} className="rq-btn rq-btn-secondary">
              <span className="flex items-center gap-1.5">
                <Icons.Info className="h-4 w-4" />
                {t('hub.trending.details')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
