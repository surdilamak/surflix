/**
 * Remark Form Modal — "Request Improvement" untuk film yang udah AVAILABLE/PROCESSING
 *
 * Beda dari RequestFormModal:
 * - Note WAJIB diisi
 * - Label & copy disesuaikan ke konteks improvement, bukan request baru
 * - Suggestions fokus ke subtitle, replace, missing episodes, audio dubbed
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';

interface RemarkFormModalProps {
  item: JellyseerrMediaItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GUEST_INFO_KEY = 'surflix_guest_info';

// Quick suggestions — fokus ke common improvement requests
const SUGGESTIONS = [
  { icon: '🇮🇩', label: 'Subtitle Indonesia', value: 'Tolong tambah subtitle Bahasa Indonesia' },
  { icon: '🇬🇧', label: 'Subtitle English', value: 'Tolong tambah subtitle English' },
  { icon: '🔁', label: 'Replace (kualitas jelek)', value: 'File yang ada kualitasnya jelek, mohon di-replace dengan versi yang lebih baik' },
  { icon: '📦', label: 'Upgrade ke 1080p+', value: 'Mohon upgrade ke kualitas 1080p atau lebih tinggi' },
  { icon: '📺', label: 'Episode hilang', value: 'Ada episode yang hilang/tidak bisa di-play, tolong dicek' },
  { icon: '🔊', label: 'Audio dubbed', value: 'Tolong tambah audio dubbing Indonesia/English' },
];

export function RemarkFormModal({ item, open, onClose, onSuccess }: RemarkFormModalProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
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
      setNote('');
      setError(null);
      setLoading(false);
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
    if (!note.trim()) {
      setError('Catatan wajib diisi — kasih tau detail-nya ya');
      return;
    }
    if (note.trim().length < 5) {
      setError('Catatan minimal 5 karakter');
      return;
    }
    if (!item) return;

    setLoading(true);

    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(GUEST_INFO_KEY) : null;
      let guestId: string | undefined;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          guestId = parsed.guestId;
        } catch {}
      }

      const res = await fetch('/api/remark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: name.trim(),
          guestId,
          note: note.trim(),
          tmdbId: item.id,
          mediaType: item.mediaType,
          title: item.title || item.name,
          posterPath: item.posterPath,
          releaseDate: item.releaseDate || item.firstAirDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Submit gagal');
        setLoading(false);
        return;
      }

      localStorage.setItem(
        GUEST_INFO_KEY,
        JSON.stringify({ name: name.trim(), guestId: data.guestId })
      );

      onSuccess();
    } catch (err) {
      setError('Network error, coba lagi');
      setLoading(false);
    }
  }

  function applySuggestion(value: string) {
    setNote(value);
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

          <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-ios-xl bg-bg-surface p-5"
            >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-medium text-ios-blue">
                  Request Improvement
                </p>
                <h3 className="text-lg font-semibold leading-tight tracking-tight">
                  {item.title || item.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-white/50">
                  Film ini udah ada di Surflix — kasih catatan kalau ada yang perlu di-improve
                </p>
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
                <label className="mb-1.5 block text-xs font-medium text-white/60">Nama lo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Budi"
                  className="input-ios w-full"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Catatan / improvement request <span className="text-ios-red">*</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Misal: tolong tambah subtitle Bahasa Indonesia"
                  className="input-ios w-full resize-none"
                  maxLength={200}
                  rows={3}
                  autoFocus
                />
                <p className="mt-1 text-right text-[10px] text-white/40">{note.length}/200</p>

                {/* Quick suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => applySuggestion(s.value)}
                      className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white/80"
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
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
                  'Kirim Catatan'
                )}
              </button>

              <p className="text-center text-[10px] text-white/40">
                Admin akan review catatan lo & follow-up kalau perlu.
              </p>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
