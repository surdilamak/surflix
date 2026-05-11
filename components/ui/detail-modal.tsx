/**
 * Detail Modal — iOS bottom sheet on mobile, centered modal on desktop
 * Pakai Framer Motion buat smooth animations
 */
'use client';

import { useEffect, useState } from 'react';
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
  // Lock body scroll saat modal open
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
  const poster = tmdbImage(item.posterPath, 'w342');
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : null;
  const status = jellyseerrStatusLabel(item.mediaInfo?.status);
  const isAvailable = status.variant === 'available';
  const isProcessing = status.variant === 'processing';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          {/* Sheet/Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[101] mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-t-ios-xl bg-bg-surface md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-ios-xl"
          >
            {/* Drag handle (mobile only) */}
            <div className="sticky top-0 z-10 flex justify-center bg-bg-surface pt-2 md:hidden">
              <div className="h-1 w-9 rounded-full bg-white/30" />
            </div>

            {/* Backdrop image with close button */}
            <div className="relative h-[180px] md:h-[200px]">
              {backdrop ? (
                <Image src={backdrop} alt={title} fill className="rounded-t-ios-xl object-cover md:rounded-t-ios-xl" sizes="(max-width: 768px) 100vw, 600px" />
              ) : (
                <div className="h-full w-full rounded-t-ios-xl bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-red-900/50" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/30 to-transparent" />

              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-ios transition-all hover:bg-black/80"
              >
                <Icons.X className="h-3.5 w-3.5" />
              </button>

              <div className="absolute inset-x-0 bottom-0 p-4">
                <h2 className="text-xl font-semibold tracking-tighter md:text-2xl">{title}</h2>
                <p className="mt-1 text-xs text-white/65">
                  {year} · {item.mediaType === 'movie' ? 'Movie' : 'Series'}
                  {rating && ` · ★ ${rating}`}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4 p-4">
              {/* Action buttons */}
              <div className="flex gap-2">
                {isAvailable ? (
                  <a
                    href={process.env.NEXT_PUBLIC_JELLYFIN_URL}
                    target="_blank"
                    rel="noopener"
                    className="btn-primary flex-1 text-center"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icons.Play className="h-4 w-4" />
                      Watch on Jellyfin
                    </span>
                  </a>
                ) : isProcessing ? (
                  <button disabled className="flex-1 cursor-not-allowed rounded-full bg-ios-blue/30 py-2.5 text-sm font-medium text-ios-blue">
                    <span className="inline-flex items-center gap-1.5">
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

              {/* Overview */}
              {item.overview && (
                <p className="text-[13px] leading-relaxed text-white/85">{item.overview}</p>
              )}

              {/* Metadata grouped list (iOS style) */}
              <div className="rounded-ios-lg bg-white/[0.04]">
                <div className="flex justify-between border-b border-white/[0.06] px-3 py-2.5 text-xs">
                  <span className="text-white/50">Type</span>
                  <span className="font-medium">{item.mediaType === 'movie' ? 'Movie' : 'TV Series'}</span>
                </div>
                {year && (
                  <div className="flex justify-between border-b border-white/[0.06] px-3 py-2.5 text-xs">
                    <span className="text-white/50">Release</span>
                    <span className="font-medium">{year}</span>
                  </div>
                )}
                {rating && (
                  <div className="flex justify-between px-3 py-2.5 text-xs">
                    <span className="text-white/50">Rating</span>
                    <span className="font-medium">★ {rating}</span>
                  </div>
                )}
              </div>

              {/* Info banner */}
              {!isAvailable && !isProcessing && (
                <div className="flex items-start gap-2 rounded-ios-lg border border-ios-blue/30 bg-ios-blue/10 p-3">
                  <Icons.Info className="mt-px h-4 w-4 flex-shrink-0 text-ios-blue" />
                  <p className="text-[11px] leading-relaxed text-white/85">
                    Request akan direview admin sebelum diproses. Notifikasi via email saat available di Jellyfin.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
