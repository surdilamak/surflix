/**
 * Detail Modal — separate mobile bottom sheet vs desktop centered modal
 * Fix bug: previously hybrid CSS caused modal to appear at bottom on desktop
 */
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { tmdbImage, getYear, jellyseerrStatusLabel } from '@/lib/utils';
import { Icons } from './icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';

interface DetailModalProps {
  item: JellyseerrMediaItem | null;
  open: boolean;
  onClose: () => void;
  onRequest: (item: JellyseerrMediaItem) => void;
}

export function DetailModal({ item, open, onClose, onRequest }: DetailModalProps) {
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
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          {/* MOBILE: Bottom Sheet (only on small screens) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[101] max-h-[90vh] overflow-y-auto rounded-t-ios-xl bg-bg-surface md:hidden"
          >
            <div className="sticky top-0 z-10 flex justify-center bg-bg-surface pt-2">
              <div className="h-1 w-9 rounded-full bg-white/30" />
            </div>
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
            />
          </motion.div>

          {/* DESKTOP: Centered Modal (only on md+ screens) */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[101] hidden w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-ios-xl bg-bg-surface md:block"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
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
              />
            </div>
          </motion.div>
        </>
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
}: {
  item: JellyseerrMediaItem;
  title: string;
  year: string;
  backdrop: string | null;
  rating: string | null;
  isAvailable: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onRequest: (item: JellyseerrMediaItem) => void;
}) {
  return (
    <>
      <div className="relative h-[200px] md:h-[240px]">
        {backdrop ? (
          <Image
            src={backdrop}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-red-900/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/30 to-transparent" />

        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-ios transition-all hover:bg-black/80"
        >
          <Icons.X className="h-4 w-4" />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
          <h2 className="text-xl font-semibold tracking-tighter md:text-2xl">{title}</h2>
          <p className="mt-1 text-xs text-white/65 md:text-sm">
            {year} · {item.mediaType === 'movie' ? 'Movie' : 'Series'}
            {rating && ` · ★ ${rating}`}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <div className="flex gap-2">
          {isAvailable ? (
            <a
              href={process.env.NEXT_PUBLIC_JELLYFIN_URL}
              target="_blank"
              rel="noopener"
              className="btn-primary flex-1 text-center"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Play className="h-4 w-4" />
                Watch on Jellyfin
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

        <div className="rounded-ios-lg bg-white/[0.04]">
          <div className="flex justify-between border-b border-white/[0.06] px-3 py-2.5 text-xs md:text-sm">
            <span className="text-white/50">Type</span>
            <span className="font-medium">{item.mediaType === 'movie' ? 'Movie' : 'TV Series'}</span>
          </div>
          {year && (
            <div className="flex justify-between border-b border-white/[0.06] px-3 py-2.5 text-xs md:text-sm">
              <span className="text-white/50">Release</span>
              <span className="font-medium">{year}</span>
            </div>
          )}
          {rating && (
            <div className="flex justify-between px-3 py-2.5 text-xs md:text-sm">
              <span className="text-white/50">Rating</span>
              <span className="font-medium">★ {rating}</span>
            </div>
          )}
        </div>

        {!isAvailable && !isProcessing && (
          <div className="flex items-start gap-2 rounded-ios-lg border border-ios-blue/30 bg-ios-blue/10 p-3">
            <Icons.Info className="mt-px h-4 w-4 flex-shrink-0 text-ios-blue" />
            <p className="text-[11px] leading-relaxed text-white/85 md:text-xs">
              Request akan direview admin sebelum diproses. Notifikasi via email saat available di Jellyfin.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
