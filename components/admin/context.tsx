/**
 * AdminProvider — toast, dialog konfirmasi, dan angka lencana (request menunggu, antrean review) untuk seluruh admin.
 * Satu tempat untuk umpan balik, jadi tiap halaman tidak perlu membuat toast dan confirm() sendiri.
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/ui/icons';

interface Counts {
  pendingRequests: number;
  reviewQueue: number;
  downloading: number;
}

interface ConfirmOpts {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface Ctx {
  counts: Counts;
  refreshCounts: () => Promise<void>;
  toast: (message: string, tone?: 'success' | 'error') => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  /** fetch JSON dengan penanganan 401 (kembali ke login) */
  api: (path: string, init?: RequestInit) => Promise<{ res: Response; data: any }>;
}

const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin(): Ctx {
  const v = useContext(AdminCtx);
  if (!v) throw new Error('useAdmin must be used inside <AdminProvider>');
  return v;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>({ pendingRequests: 0, reviewQueue: 0, downloading: 0 });
  const [toastState, setToastState] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, init);
      if (res.status === 401) {
        router.push('/login');
      }
      const data = await res.json().catch(() => ({}));
      return { res, data };
    },
    [router]
  );

  const refreshCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/counts', { cache: 'no-store' });
      if (res.ok) setCounts(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    refreshCounts();
    const id = setInterval(refreshCounts, 30000);
    const onVisible = () => document.visibilityState === 'visible' && refreshCounts();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshCounts]);

  const toast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToastState({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(null), tone === 'error' ? 6000 : 3500);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })),
    []
  );
  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  const value = useMemo(() => ({ counts, refreshCounts, toast, confirm, api }), [counts, refreshCounts, toast, confirm, api]);

  return (
    <AdminCtx.Provider value={value}>
      {children}

      {toastState && (
        <div className="ad-toast-wrap" role="status" aria-live="polite">
          <div className="ad-toast" data-tone={toastState.tone}>
            {toastState.tone === 'success' ? <Icons.CheckCircle2 /> : <Icons.XCircle />}
            <span>{toastState.message}</span>
          </div>
        </div>
      )}

      {dialog && (
        <div className="ad-modal" onClick={() => close(false)}>
          <div className="ad-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="ad-dlg-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="ad-dlg-t" className="ad-h2">{dialog.title}</h2>
            {dialog.body && <p className="ad-text ad-muted">{dialog.body}</p>}
            <div className="ad-modal-actions">
              <button type="button" className="ad-btn ad-btn--ghost" onClick={() => close(false)}>Cancel</button>
              <button
                type="button"
                autoFocus
                className={`ad-btn ${dialog.danger ? 'ad-btn--danger' : 'ad-btn--primary'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminCtx.Provider>
  );
}
