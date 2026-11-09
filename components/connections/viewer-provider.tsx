/**
 * ViewerProvider: who is looking at the portal (a Jellyfin account, optional) and which titles they
 * have already watched. Signed out, everything works exactly as before; signing in only adds marks.
 * The login dialog lives here so there is one instance for the whole portal.
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from './lang-provider';
import './viewer-dialog.css';

interface ViewerCtx {
  status: 'loading' | 'out' | 'in';
  name: string | null;
  /** how they signed in: 'form' = Surflix sign-in form, 'jellyfin' = the Jellyfin plugin cookie (ends only by signing out of Jellyfin) */
  via: 'form' | 'jellyfin' | null;
  /** true if the viewer is signed in AND has finished this title */
  isWatched: (mediaType: string | null | undefined, tmdbId: number | null | undefined) => boolean;
  /** true if the viewer is signed in AND saved this title to Watch later */
  isSaved: (mediaType: string | null | undefined, tmdbId: number | null | undefined) => boolean;
  /** Save or unsave. Signed out, this opens the sign-in dialog instead. Resolves false if the request failed. */
  toggleLater: (mediaType: string, tmdbId: number) => Promise<boolean>;
  openLogin: () => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<ViewerCtx | null>(null);

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const [status, setStatus] = useState<ViewerCtx['status']>('loading');
  const [name, setName] = useState<string | null>(null);
  const [via, setVia] = useState<'form' | 'jellyfin' | null>(null);
  const [played, setPlayed] = useState<Set<string>>(new Set());
  const [later, setLater] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const apply = useCallback((d: { loggedIn?: boolean; name?: string; via?: 'form' | 'jellyfin'; played?: string[]; later?: string[]; guestId?: string | null }) => {
    if (d.loggedIn) {
      // a new device: pick up the Request Hub history of this account so My Requests is not empty
      try {
        if (d.guestId && !JSON.parse(localStorage.getItem('surflix_guest_info') || '{}').guestId) {
          localStorage.setItem('surflix_guest_info', JSON.stringify({ name: d.name ?? '', guestId: d.guestId }));
        }
      } catch {}
      setStatus('in');
      setName(d.name ?? null);
      setVia(d.via ?? 'form');
      setPlayed(new Set(d.played ?? []));
      setLater(new Set(d.later ?? []));
    } else {
      setStatus('out');
      setName(null);
      setVia(null);
      setPlayed(new Set());
      setLater(new Set());
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/viewer', { cache: 'no-store' });
      apply(await res.json());
    } catch {
      setStatus('out');
    }
  }, [apply]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const logout = useCallback(async () => {
    await fetch('/api/viewer', { method: 'DELETE' }).catch(() => {});
    apply({ loggedIn: false });
  }, [apply]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/viewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      if (res.ok) {
        await refresh();
        setOpen(false);
      } else {
        const code = res.status === 401 ? 'credentials' : res.status === 429 ? 'rate' : 'unavailable';
        setError(t(`viewer.err.${code}`));
      }
    } catch {
      setError(t('viewer.err.unavailable'));
    } finally {
      setBusy(false);
    }
  }

  const openLogin = useCallback(() => {
    setError(null);
    setOpen(true);
  }, []);

  const toggleLater = useCallback(
    async (mediaType: string, tmdbId: number) => {
      if (status !== 'in') {
        openLogin();
        return true;
      }
      const key = `${mediaType}:${tmdbId}`;
      const save = !later.has(key);
      const flip = (on: boolean) =>
        setLater((prev) => {
          const next = new Set(prev);
          if (on) next.add(key);
          else next.delete(key);
          return next;
        });
      flip(save); // optimistic; rolled back below if the request fails
      try {
        const res = await fetch('/api/viewer/later', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaType, tmdbId, save }),
        });
        if (res.status === 401) {
          flip(!save);
          await refresh(); // session expired: the header now shows signed out
          openLogin();
          return true;
        }
        if (!res.ok) throw new Error(String(res.status));
        return true;
      } catch {
        flip(!save);
        return false;
      }
    },
    [status, later, openLogin, refresh]
  );

  const value = useMemo<ViewerCtx>(
    () => ({
      status,
      name,
      via,
      isWatched: (mt, id) => status === 'in' && !!mt && !!id && played.has(`${mt}:${id}`),
      isSaved: (mt, id) => status === 'in' && !!mt && !!id && later.has(`${mt}:${id}`),
      toggleLater,
      openLogin,
      logout,
    }),
    [status, name, via, played, later, toggleLater, openLogin, logout]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <dialog ref={dialogRef} className="ref-viewer-dialog" onClose={() => setOpen(false)} aria-labelledby="ref-viewer-title">
        <form onSubmit={submit}>
          <h2 id="ref-viewer-title">{t('viewer.title')}</h2>
          <p>{t('viewer.lead')}</p>
          <label>
            {t('viewer.user')}
            <input name="username" autoComplete="username" required maxLength={100} />
          </label>
          <label>
            {t('viewer.pass')}
            <input name="password" type="password" autoComplete="current-password" maxLength={200} />
          </label>
          {error && <p role="alert" className="ref-viewer-error">{error}</p>}
          <small>{t('viewer.privacy')}</small>
          <div className="ref-viewer-actions">
            <button type="button" onClick={() => setOpen(false)}>{t('viewer.cancel')}</button>
            <button type="submit" disabled={busy}>{busy ? t('viewer.busy') : t('viewer.submit')}</button>
          </div>
        </form>
      </dialog>
    </Ctx.Provider>
  );
}

export function useViewer(): ViewerCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useViewer must be used inside <ViewerProvider>');
  return v;
}
