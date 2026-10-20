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
import { useLang } from '@/components/connections/lang-provider';

interface RemarkFormModalProps {
  item: JellyseerrMediaItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GUEST_INFO_KEY = 'surflix_guest_info';

// Quick suggestions — fokus ke common improvement requests
const NOTE_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

export function RemarkFormModal({ item, open, onClose, onSuccess }: RemarkFormModalProps) {
  const { t } = useLang();
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
      setError(t('hub.form.nameRequired'));
      return;
    }
    if (name.trim().length < 2) {
      setError(t('hub.form.nameMin'));
      return;
    }
    if (!note.trim()) {
      setError(t('hub.remark.noteRequired'));
      return;
    }
    if (note.trim().length < 5) {
      setError(t('hub.remark.noteMin'));
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
        setError(data.error || t('hub.remark.failed'));
        setLoading(false);
        return;
      }

      localStorage.setItem(
        GUEST_INFO_KEY,
        JSON.stringify({ name: name.trim(), guestId: data.guestId })
      );

      onSuccess();
    } catch (err) {
      setError(t('hub.remark.network'));
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
                  {t('hub.remark.title')}
                </p>
                <h3 className="rq-h2">
                  {item.title || item.name}
                </h3>
                <p className="mt-0.5 text-xs text-rq-muted">
                  {t('hub.remark.sub')}
                </p>
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
                <label className="rq-small mb-2 block text-rq-muted">{t('hub.form.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('hub.form.namePh')}
                  className="input-ios w-full"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="rq-small mb-2 block text-rq-muted">
                  {t('hub.remark.label')} <span className="text-ios-red">*</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('hub.remark.notePh')}
                  className="input-ios w-full resize-none"
                  maxLength={200}
                  rows={3}
                  autoFocus
                />
                <p className="mt-1 text-right text-xs text-rq-muted">{note.length}/200</p>

                {/* Quick suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {NOTE_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => applySuggestion(t(`hub.remark.${k}v`))}
                      className="rounded-rq bg-rq-raised px-3 min-h-10 inline-flex items-center text-xs text-rq-muted transition-colors hover:bg-[#2e2e33] hover:text-white"
                    >
                      {t(`hub.remark.${k}`)}
                    </button>
                  ))}
                </div>
              </div>

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
                    {t('hub.remark.sending')}
                  </span>
                ) : (
                  t('hub.remark.send')
                )}
              </button>

              <p className="text-center text-xs text-rq-muted">
                {t('hub.remark.foot')}
              </p>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
