/**
 * ViewerProvider: who is looking at the portal (a Jellyfin account, optional) and which titles they
 * have already watched. Signed out, everything works exactly as before; signing in only adds marks.
 * The login dialog lives here so there is one instance for the whole portal.
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from './lang-provider';

interface ViewerCtx {
  status: 'loading' | 'out' | 'in';
  name: string | null;
  /** true if the viewer is signed in AND has finished this title */
  isWatched: (mediaType: string | null | undefined, tmdbId: number | null | undefined) => boolean;
  openLogin: () => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<ViewerCtx | null>(null);

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const [status, setStatus] = useState<ViewerCtx['status']>('loading');
  const [name, setName] = useState<string | null>(null);
  const [played, setPlayed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const apply = useCallback((d: { loggedIn?: boolean; name?: string; played?: string[] }) => {
    if (d.loggedIn) {
      setStatus('in');
      setName(d.name ?? null);
      setPlayed(new Set(d.played ?? []));
    } else {
      setStatus('out');
      setName(null);
      setPlayed(new Set());
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

  const value = useMemo<ViewerCtx>(
    () => ({
      status,
      name,
      isWatched: (mt, id) => status === 'in' && !!mt && !!id && played.has(`${mt}:${id}`),
      openLogin: () => {
        setError(null);
        setOpen(true);
      },
      logout,
    }),
    [status, name, played, logout]
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
