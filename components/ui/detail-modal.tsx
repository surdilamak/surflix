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
import { watchUrl } from '@/lib/jellyfin';
import { Icons } from './icons';
import { ReferenceSection } from '@/components/connections/reference-section';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { useLang } from '@/components/connections/lang-provider';

interface DetailModalProps {
  item: JellyseerrMediaItem | null;
  open: boolean;
  onClose: () => void;
  onRequest: (item: JellyseerrMediaItem) => void;
  // Optional — kalau di-pass, button "Request Improvement" muncul untuk film yang
  // sudah AVAILABLE/PROCESSING (mis. minta subtitle Indo, replace file jelek).
  onRequestImprovement?: (item: JellyseerrMediaItem) => void;
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

export function DetailModal({ item, open, onClose, onRequest, onRequestImprovement }: DetailModalProps) {
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
            className="absolute inset-0 bg-black/70 "
          />

          {/* Modal Content */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: isMobile ? 30 : 25, stiffness: 300 }}
            className={`relative z-10 w-full overflow-hidden bg-rq-surface ${
              isMobile
                ? 'max-h-[90vh] rounded-t-rq'
                : 'max-w-2xl rounded-rq'
            }`}
            style={{ maxHeight: isMobile ? '90vh' : 'calc(100vh - 2rem)' }}
          >
            {/* Drag handle (mobile only) — absolute overlay supaya image bisa fill ke top */}
            {isMobile && (
              <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
                <div className="h-1 w-9 rounded-rq bg-white/60" />
              </div>
            )}

            <div className="overflow-y-auto" style={{ maxHeight: 'inherit' }}>
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
                onRequestImprovement={onRequestImprovement}
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
  onRequestImprovement,
  detail,
  loadingDetail,
}: any) {
  const config = useAppConfig();
  const { t } = useLang();
  const jellyfinUrl = config?.jellyfinUrl || '#';

  // Deep-link ke film itu di Jellyfin (bukan cuma home). jellyfinId diambil dari snapshot library;
  // film yang belum ada di snapshot jatuh ke link home Jellyfin.
  const [jellyfinId, setJellyfinId] = useState<string | null>(null);
  useEffect(() => {
    setJellyfinId(null);
    if (!isAvailable) return;
    let cancelled = false;
    fetch(`/api/library/title?type=${item.mediaType}&id=${item.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.jellyfinId) setJellyfinId(d.jellyfinId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id, item.mediaType, isAvailable]);
  const watchHref =
    jellyfinId && config?.jellyfinUrl ? watchUrl(jellyfinId, config.jellyfinUrl, config.jellyfinServerId) : jellyfinUrl;

  return (
    <>
      <div className="relative h-[180px] md:h-[220px]">
        {backdrop ? (
          <Image src={backdrop} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
        ) : (
          <div className="h-full w-full bg-rq-raised" />
        )}

        <button
          onClick={onClose}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-rq bg-rq-bg/80 text-white transition-colors hover:bg-rq-bg"
          aria-label={t('hub.detail.close')}
        >
          <Icons.X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <div>
          <h2 className="rq-h2 !text-2xl">{title}</h2>
          {detail?.tagline && (
            <p className="rq-small mt-1 text-rq-muted">{detail.tagline}</p>
          )}
          <p className="rq-small mt-1 text-rq-muted">
            {year} · {item.mediaType === 'movie' ? t('hub.type.movie') : t('hub.poster.series')}
            {detail?.runtime && ` · ${formatRuntime(detail.runtime)}`}
            {rating && (
              <>
                {' · '}
                <Icons.Star className="-mt-0.5 inline h-3 w-3 fill-current" /> {rating}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {isAvailable ? (
            <a
              href={watchHref}
              target="_blank"
              rel="noopener"
              className="btn-primary w-full"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Play className="h-4 w-4" />
                {t('hub.detail.watch')}
              </span>
            </a>
          ) : isProcessing ? (
            <button disabled className="btn-secondary w-full">
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Download className="h-4 w-4" />
                {t('hub.detail.downloading')}
              </span>
            </button>
          ) : (
            <button onClick={() => onRequest(item)} className="btn-primary w-full">
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Plus className="h-4 w-4" />
                {t(item.mediaType === 'movie' ? 'hub.detail.requestMovie' : 'hub.detail.requestSeries')}
              </span>
            </button>
          )}

          {/* Secondary CTA: Request Improvement — untuk film yang udah AVAILABLE/PROCESSING.
              Use case: minta subtitle, complaint kualitas, episode hilang, dll. */}
          {(isAvailable || isProcessing) && onRequestImprovement && (
            <button
              onClick={() => onRequestImprovement(item)}
              className="btn-secondary w-full"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.MessageSquare className="h-4 w-4" />
                {t('hub.detail.improve')}
              </span>
            </button>
          )}
        </div>

        {/* Link ke portal Referensi — muncul kalau film ini punya peta referensi */}
        {(item.mediaType === 'movie' || item.mediaType === 'tv') && (
          <ReferenceSection
            key={`${item.mediaType}-${item.id}`}
            tmdbId={item.id}
            mediaType={item.mediaType}
          />
        )}

        {item.overview && (
          <p className="text-[13px] leading-relaxed text-white md:text-sm">{item.overview}</p>
        )}

        {detail?.genres && detail.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {detail.genres.map((g: string) => (
              <span key={g} className="rounded-rq bg-rq-raised px-2.5 py-1.5 text-xs font-medium text-white">
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-rq bg-rq-raised text-sm">
          {(detail?.director || detail?.creators) && (
            <MetadataRow
              label={item.mediaType === 'tv' ? t('hub.detail.creators') : t('hub.detail.director')}
              value={detail.director || detail.creators?.join(', ')}
            />
          )}
          {detail?.cast && detail.cast.length > 0 && (
            <MetadataRow
              label={t('hub.detail.cast')}
              value={detail.cast.map((c: any) => c.name).join(', ')}
            />
          )}
          {item.mediaType === 'tv' && detail?.numberOfSeasons !== undefined && (
            <MetadataRow
              label={t('hub.detail.seasons')}
              value={t(detail.numberOfSeasons === 1 ? 'hub.detail.seasonValue' : 'hub.detail.seasonsValue', { n: detail.numberOfSeasons, m: detail.numberOfEpisodes || '?' })}
            />
          )}
          {detail?.networks && detail.networks.length > 0 && (
            <MetadataRow label={t('hub.detail.network')} value={detail.networks.join(', ')} />
          )}
          {detail?.productionCompanies && detail.productionCompanies.length > 0 && item.mediaType === 'movie' && (
            <MetadataRow label={t('hub.detail.studio')} value={detail.productionCompanies.join(', ')} />
          )}
          <MetadataRow label={t('hub.detail.type')} value={item.mediaType === 'movie' ? t('hub.type.movie') : t('hub.type.tv')} />
          {year && <MetadataRow label={t('hub.detail.release')} value={year} />}
          {rating && <MetadataRow label={t('hub.detail.rating')} value={`${rating} / 10`} last />}
        </div>

        {loadingDetail && (
          <div className="flex items-center justify-center gap-2 text-xs text-rq-muted">
            <Icons.Loader2 className="h-3 w-3 animate-spin" />
            {t('hub.detail.loading')}
          </div>
        )}

        {!isAvailable && !isProcessing && (
          <div className="flex items-start gap-2 rounded-rq bg-rq-raised p-3">
            <Icons.Info className="mt-px h-4 w-4 flex-shrink-0 text-rq-accent" />
            <p className="rq-small text-white">
              {t('hub.detail.review')}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function MetadataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="flex justify-between px-3 py-3">
      <span className="flex-shrink-0 text-rq-muted">{label}</span>
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
