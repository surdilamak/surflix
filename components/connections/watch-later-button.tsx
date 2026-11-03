/**
 * WatchLaterButton: secondary action next to "Watch". Saves the title to the viewer's "Watch later"
 * playlist in Jellyfin (it also shows up in the Jellyfin apps). Signed out, a click opens the
 * sign-in dialog, so the button is always visible and explains itself.
 */
'use client';

import { useState } from 'react';
import { useLang } from './lang-provider';
import { useViewer } from './viewer-provider';

export function WatchLaterButton({
  mediaType,
  tmdbId,
  className = 'ref-btn ref-btn--secondary',
}: {
  mediaType: string | null | undefined;
  tmdbId: number | null | undefined;
  className?: string;
}) {
  const { t } = useLang();
  const viewer = useViewer();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!mediaType || !tmdbId) return null;

  const saved = viewer.isSaved(mediaType, tmdbId);

  async function click() {
    setBusy(true);
    setFailed(false);
    const ok = await viewer.toggleLater(mediaType as string, tmdbId as number);
    setFailed(!ok);
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        className={`${className} ref-later`}
        aria-pressed={saved}
        disabled={busy}
        title={t(saved ? 'later.removeHint' : 'later.hint')}
        onClick={click}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill={saved ? 'currentColor' : 'none'}>
          <path d="M3.5 1.75h9v12.5L8 11l-4.5 3.25z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        {t(saved ? 'later.saved' : 'later.add')}
      </button>
      <span role="status" className="ref-later-err">{failed ? t('later.err') : ''}</span>
    </>
  );
}
