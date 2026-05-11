/**
 * Request Form Modal — name only (cookie-based identification)
 * No email field — guest cuma input nama, identified via cookie/localStorage
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';

interface RequestFormModalProps {
  item: JellyseerrMediaItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GUEST_INFO_KEY = 'surflix_guest_info';

export function RequestFormModal({ item, open, onClose, onSuccess }: RequestFormModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const saved = localStorage.getItem(GUEST_INFO_KEY);
      if (saved) {
        try {
          const { name: n } = JSON.parse(saved);
          if (n) setName(n);
        } catch {}
      }
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);

    if (!name.trim()) {
      setError('Nama wajib diisi');
      return;
    }
    if (name.trim().length < 2) {
      setError('Nama minimal 2 karakter');
      return;
    }
    if (!item) return;

    setLoading(true);

    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: name.trim(),
          tmdbId: item.id,
          mediaType: item.mediaType,
          title: item.title || item.name,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath,
          overview: item.overview,
          releaseDate: item.releaseDate || item.firstAirDate,
          rating: item.voteAverage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request gagal');
        setLoading(false);
        return;
      }

      // Save guest name + ID to localStorage
      localStorage.setItem(GUEST_INFO_KEY, JSON.stringify({
        name: name.trim(),
        guestId: data.guestId, // server returns unique guestId
      }));

      onSuccess();
    } catch (err) {
      setError('Network error, coba lagi');
      setLoading(false);
    }
  }

  if (!item) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[111] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-ios-xl bg-bg-surface p-5"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-surflix-500">Request {item.mediaType === 'movie' ? 'Movie' : 'Series'}</p>
                <h3 className="text-lg font-semibold leading-tight tracking-tight">
                  {item.title || item.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white"
              >
                <Icons.X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Nama lo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Budi"
                  className="input-ios w-full"
                  maxLength={50}
                  autoFocus
                />
                <p className="mt-1.5 text-[10px] text-white/40">
                  Cuma nama doang. Kita inget lo via cookie browser ini.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-ios-lg border border-ios-red/30 bg-ios-red/10 p-2.5">
                  <Icons.AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ios-red" />
                  <p className="text-[11px] text-white/85">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
