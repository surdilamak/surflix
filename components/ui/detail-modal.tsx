/**
 * Detail Modal v5 — bulletproof responsive
 *
 * Pattern: single container with responsive alignment.
 * - Mobile (< md): justify-center + items-end → bottom sheet
 * - Desktop (>= md): justify-center + items-center → centered modal
 *
 * No separate components, no display switches between mobile/desktop renders
 * (yang ngebreak transition state).
 */
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { tmdbImage, getYear, jellyseerrStatusLabel } from '@/lib/utils';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { Icons } from './icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';

interface DetailModalProps {
  item: JellyseerrMediaItem | null;
  open: boolean;
  onClose: () => void;
  onRequest: (item: JellyseerrMediaItem) => void;
}

interface DetailData {
  director?: string | null;
  creators?: string[] | null;
  cast?: Array<{ name: string; character: string; profilePath?: string }>;
  genres?: string[];
  runtime?: number;
  productionCompanies?: string[];
  networks?: string[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  tagline?: string;
}

export function DetailModal({ item, open, onClose, onRequest }: DetailModalProps) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile via media query (runs only on client)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Fetch metadata when modal opens
  useEffect(() => {
    if (!item || !open) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/detail?type=${item.mediaType}&id=${item.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setDetail(data);
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [item, open]);

  if (!item) return null;

  const title = item.title || item.name || 'Untitled';
  const date = item.releaseDate || item.firstAirDate;
  const year = getYear(date);
  const backdrop = tmdbImage(item.backdropPath, 'w780');
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : null;
  const status = jellyseerrStatusLabel(item.mediaInfo?.status);
  const isAvailable = status.variant === 'available';
  const isProcessing = status.variant === 'processing';

  return (
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 z-[100] flex justify-center ${
            isMobile ? 'items-end' : 'items-center md:p-4'
          }`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: isMobile ? 30 : 25, stiffness: 300 }}
            className={`relative z-10 w-full overflow-hidden bg-bg-surface ${
              isMobile
                ? 'max-h-[90vh] rounded-t-ios-xl'
                : 'max-w-2xl rounded-ios-xl'
            }`}
            style={{ maxHeight: isMobile ? '90vh' : 'calc(100vh - 2rem)' }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: 'inherit' }}>
              {isMobile && (
                <div className="sticky top-0 z-10 flex justify-center bg-bg-surface pt-2">
                  <div className="h-1 w-9 rounded-full bg-white/30" />
                </div>
              )}

              <ModalContent
                item={item}
                title={title}
                year={year}
                backdrop={backdrop}
                rating={rating}
                isAvailable={isAvailable}
                isProcessing={isProcessing}
                onClose={onClose}
                onRequest={onRequest}
                detail={detail}
                loadingDetail={loadingDetail}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ModalContent({
  item,
  title,
  year,
  backdrop,
  rating,
  isAvailable,
  isProcessing,
  onClose,
  onRequest,
  detail,
  loadingDetail,
}: any) {
  const config = useAppConfig();
  const jellyfinUrl = config?.jellyfinUrl || '#';

  return (
    <>
      <div className="relative h-[200px] md:h-[240px]">
        {backdrop ? (
          <Image src={backdrop} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-red-900/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/30 to-transparent" />

        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-ios transition-all hover:bg-black/80"
          aria-label="Close"
        >
          <Icons.X className="h-4 w-4" />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
          <h2 className="text-xl font-semibold tracking-tighter md:text-2xl">{title}</h2>
          {detail?.tagline && (
            <p className="mt-0.5 text-[11px] italic text-white/60 md:text-xs">{detail.tagline}</p>
          )}
          <p className="mt-1 text-xs text-white/65 md:text-sm">
            {year} · {item.mediaType === 'movie' ? 'Movie' : 'Series'}
            {detail?.runtime && ` · ${formatRuntime(detail.runtime)}`}
            {rating && ` · ★ ${rating}`}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <div className="flex gap-2">
          {isAvailable ? (
            <a href={jellyfinUrl} target="_blank" rel="noopener" className="btn-primary flex-1 text-center">
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Play className="h-4 w-4" />
                Watch on Surflix
              </span>
            </a>
          ) : isProcessing ? (
            <button disabled className="flex-1 cursor-not-allowed rounded-full bg-ios-blue/30 py-2.5 text-sm font-medium text-ios-blue">
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Download className="h-4 w-4" />
                Downloading
              </span>
            </button>
          ) : (
            <button onClick={() => onRequest(item)} className="btn-primary flex-1">
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Plus className="h-4 w-4" />
                Request {item.mediaType === 'movie' ? 'Movie' : 'Series'}
              </span>
            </button>
          )}
        </div>

        {item.overview && (
          <p className="text-[13px] leading-relaxed text-white/85 md:text-sm">{item.overview}</p>
        )}

        {detail?.genres && detail.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {detail.genres.map((g: string) => (
              <span key={g} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/70 md:text-xs">
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-ios-lg bg-white/[0.04] text-xs md:text-sm">
          {(detail?.director || detail?.creators) && (
            <MetadataRow
              label={item.mediaType === 'tv' ? 'Creators' : 'Director'}
              value={detail.director || detail.creators?.join(', ')}
            />
          )}
          {detail?.cast && detail.cast.length > 0 && (
            <MetadataRow
              label="Cast"
              value={detail.cast.map((c: any) => c.name).join(', ')}
            />
          )}
          {item.mediaType === 'tv' && detail?.numberOfSeasons !== undefined && (
            <MetadataRow
              label="Seasons"
              value={`${detail.numberOfSeasons} season${detail.numberOfSeasons !== 1 ? 's' : ''} · ${detail.numberOfEpisodes || '?'} episodes`}
            />
          )}
          {detail?.networks && detail.networks.length > 0 && (
            <MetadataRow label="Network" value={detail.networks.join(', ')} />
          )}
          {detail?.productionCompanies && detail.productionCompanies.length > 0 && item.mediaType === 'movie' && (
            <MetadataRow label="Studio" value={detail.productionCompanies.join(', ')} />
          )}
          <MetadataRow label="Type" value={item.mediaType === 'movie' ? 'Movie' : 'TV Series'} />
          {year && <MetadataRow label="Release" value={year} />}
          {rating && <MetadataRow label="Rating" value={`★ ${rating}`} last />}
        </div>

        {loadingDetail && (
          <div className="flex items-center justify-center gap-2 text-xs text-white/40">
            <Icons.Loader2 className="h-3 w-3 animate-spin" />
            Loading metadata...
          </div>
        )}

        {!isAvailable && !isProcessing && (
          <div className="flex items-start gap-2 rounded-ios-lg border border-ios-blue/30 bg-ios-blue/10 p-3">
            <Icons.Info className="mt-px h-4 w-4 flex-shrink-0 text-ios-blue" />
            <p className="text-[11px] leading-relaxed text-white/85 md:text-xs">
              Request akan direview admin sebelum diproses. Status akan ke-update di tab "My Requests".
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function MetadataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between px-3 py-2.5 ${!last ? 'border-b border-white/[0.06]' : ''}`}>
      <span className="flex-shrink-0 text-white/50">{label}</span>
      <span className="ml-3 text-right font-medium leading-tight">{value}</span>
    </div>
  );
}

function formatRuntime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
