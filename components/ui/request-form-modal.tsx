/**
 * Request Form Modal — name + optional notes
 *
 * Notes field examples:
 * - "Tolong sertakan subtitle Bahasa Indonesia"
 * - "File film yang ada sekarang jelek, mohon di-replace"
 * - "Episode terakhir hilang, request ulang"
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

// Quick note suggestions
const NOTE_SUGGESTIONS = [
  { label: 'Tambah subtitle Indonesia', value: 'Tolong sertakan subtitle Bahasa Indonesia' },
  { label: 'Tambah subtitle English', value: 'Tolong sertakan subtitle English' },
  { label: 'File jelek, replace', value: 'File film yang ada sekarang kualitasnya jelek, mohon di-replace' },
  { label: 'Quality 1080p+', value: 'Mohon kualitas 1080p atau lebih tinggi' },
];

export function RequestFormModal({ item, open, onClose, onSuccess }: RequestFormModalProps) {
  const [name, setName] = useState('');
  const [guestId, setGuestId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoteField, setShowNoteField] = useState(false);

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const saved = localStorage.getItem(GUEST_INFO_KEY);
      if (saved) {
        try {
          const { name: n, guestId: gid } = JSON.parse(saved);
          if (n) setName(n);
          if (gid) setGuestId(gid);
        } catch {}
      }
      // Reset transient state when reopening — onSuccess never resets loading,
      // so without this the submit button stays stuck in loading on the next open.
      setNote('');
      setShowNoteField(false);
      setLoading(false);
      setError(null);
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
          guestId,
          guestNote: note.trim() || undefined,
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

      localStorage.setItem(GUEST_INFO_KEY, JSON.stringify({
        name: name.trim(),
        guestId: data.guestId,
      }));

      onSuccess();
    } catch (err) {
      setError('Network error, coba lagi');
      setLoading(false);
    }
  }

  function applySuggestion(value: string) {
    setNote(value);
    setShowNoteField(true);
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
            className="fixed inset-0 z-[110] bg-black/70 "
          />

          <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-rq bg-rq-surface p-5"
            >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-rq-accent">
                  Request {item.mediaType === 'movie' ? 'Movie' : 'Series'}
                </p>
                <h3 className="rq-h2">
                  {item.title || item.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-rq text-rq-muted hover:bg-rq-raised hover:text-white"
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="rq-small mb-2 block text-rq-muted">Nama lo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Budi"
                  className="input-ios w-full"
                  maxLength={50}
                  autoFocus
                />
              </div>

              {/* Notes section */}
              {!showNoteField ? (
                <div>
                  <button
                    onClick={() => setShowNoteField(true)}
                    className="flex w-full items-center justify-between rounded-rq bg-rq-raised px-3 min-h-11 text-left rq-small text-rq-muted transition-colors hover:bg-[#2e2e33] hover:text-white"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icons.Plus className="h-3 w-3" />
                      Tambah catatan khusus (opsional)
                    </span>
                    <Icons.ChevronRight className="h-3 w-3" />
                  </button>

                  {/* Quick suggestions */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {NOTE_SUGGESTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => applySuggestion(s.value)}
                        className="rounded-rq bg-rq-raised px-3 min-h-10 inline-flex items-center text-xs text-rq-muted transition-colors hover:bg-[#2e2e33] hover:text-white"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="rq-small text-rq-muted">Catatan khusus</label>
                    <button
                      onClick={() => { setShowNoteField(false); setNote(''); }}
                      className="rq-small inline-flex min-h-11 items-center px-2 text-rq-muted hover:text-white"
                    >
                      Hapus
                    </button>
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Misal: Tolong sertakan subtitle Bahasa Indonesia"
                    className="input-ios w-full resize-none"
                    maxLength={200}
                    rows={3}
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-rq-muted text-right">
                    {note.length}/200
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-rq bg-rq-raised p-3">
                  <Icons.AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ios-red" />
                  <p className="text-xs text-white">{error}</p>
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

              <p className="text-center text-xs text-rq-muted">
                Kita inget lo via cookie browser ini, gak perlu email.
              </p>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
