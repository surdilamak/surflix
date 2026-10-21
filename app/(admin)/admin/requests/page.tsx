/**
 * Admin Requests (/admin/requests)
 *
 * Satu tempat untuk semua request tamu: tab Pending (approve/reject, pilih musim, aksi massal)
 * dan History (filter status, cari judul atau tamu). Menggantikan halaman Pending dan History yang terpisah.
 */
'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/ui/icons';
import { useAdmin } from '@/components/admin/context';
import { Badge, Empty, PageHead, Poster, Skeletons } from '@/components/admin/ui';
import { ago, REJECT_REASONS, REQUEST_STATUS } from '@/lib/admin-format';

interface Req {
  id: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  rating?: number | null;
  status: string;
  guestNote?: string | null;
  adminNote?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  availableAt?: string | null;
  rejectedAt?: string | null;
  guest: { name: string; email: string };
}

const HISTORY_FILTERS = ['all', 'AVAILABLE', 'PROCESSING', 'ON_SCHEDULE', 'APPROVED', 'REJECTED', 'FAILED'] as const;
type HistoryFilter = (typeof HISTORY_FILTERS)[number];

const poster = (p?: string | null, w = 185) => (p ? `https://image.tmdb.org/t/p/w${w}${p}` : null);

function RequestsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { api, toast, confirm, refreshCounts } = useAdmin();

  const view: 'pending' | 'history' = sp.get('view') === 'history' ? 'history' : 'pending';
  const [all, setAll] = useState<Req[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    const { res, data } = await api('/api/admin/requests?status=ALL&limit=400');
    if (res.ok) setAll(data.requests ?? []);
  }, [api]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const pending = useMemo(() => (all ?? []).filter((r) => r.status === 'PENDING_ADMIN').sort((a, b) => +new Date(a.requestedAt) - +new Date(b.requestedAt)), [all]);
  const history = useMemo(() => (all ?? []).filter((r) => r.status !== 'PENDING_ADMIN'), [all]);

  function setView(v: 'pending' | 'history') {
    const params = new URLSearchParams(sp.toString());
    if (v === 'pending') params.delete('view');
    else params.set('view', v);
    router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false });
  }

  function markBusy(id: string, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function approve(r: Req, seasons?: number[] | 'all'): Promise<boolean> {
    markBusy(r.id, true);
    const { res, data } = await api('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: r.id, ...(seasons && r.mediaType === 'tv' ? { seasons } : {}) }),
    });
    markBusy(r.id, false);
    if (!res.ok) {
      toast(data.error || `Could not approve ${r.title}`, 'error');
      return false;
    }
    setAll((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, status: 'ON_SCHEDULE', approvedAt: new Date().toISOString() } : x)));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(r.id);
      return n;
    });
    refreshCounts();
    return true;
  }

  async function reject(r: Req, reason?: string): Promise<boolean> {
    markBusy(r.id, true);
    const { res, data } = await api('/api/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: r.id, reason: reason || undefined }),
    });
    markBusy(r.id, false);
    if (!res.ok) {
      toast(data.error || `Could not reject ${r.title}`, 'error');
      return false;
    }
    setAll((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, status: 'REJECTED', adminNote: reason ?? null, rejectedAt: new Date().toISOString() } : x)));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(r.id);
      return n;
    });
    refreshCounts();
    return true;
  }

  async function bulk(kind: 'approve' | 'reject') {
    const list = pending.filter((r) => selected.has(r.id));
    if (list.length === 0) return;
    const ok = await confirm({
      title: `${kind === 'approve' ? 'Approve' : 'Reject'} ${list.length} request${list.length === 1 ? '' : 's'}?`,
      body:
        kind === 'approve'
          ? 'Each one is sent to Jellyseerr and the guest is notified. TV series are requested with all seasons.'
          : 'The guests are notified. You can leave a reason on single requests instead.',
      confirmLabel: kind === 'approve' ? `Approve ${list.length}` : `Reject ${list.length}`,
      danger: kind === 'reject',
    });
    if (!ok) return;
    setBulkBusy(true);
    let done = 0;
    for (const r of list) {
      const good = kind === 'approve' ? await approve(r) : await reject(r);
      if (good) done++;
    }
    setBulkBusy(false);
    toast(`${done} of ${list.length} ${kind === 'approve' ? 'approved' : 'rejected'}`, done === list.length ? 'success' : 'error');
  }

  return (
    <>
      <PageHead
        title="Requests"
        sub={all ? `${pending.length} waiting · ${history.length} handled` : 'Loading…'}
      >
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={load}>
          <Icons.RefreshCw /> Refresh
        </button>
      </PageHead>

      <div className="ad-seg" role="group" aria-label="View" style={{ marginBottom: 16 }}>
        <button type="button" aria-pressed={view === 'pending'} onClick={() => setView('pending')}>
          Pending{all ? ` (${pending.length})` : ''}
        </button>
        <button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>
          History{all ? ` (${history.length})` : ''}
        </button>
      </div>

      {all === null ? (
        <Skeletons n={3} h={140} />
      ) : view === 'pending' ? (
        <PendingView
          list={pending}
          busy={busy}
          selected={selected}
          setSelected={setSelected}
          bulkBusy={bulkBusy}
          onApprove={approve}
          onReject={reject}
          onBulk={bulk}
          onToast={toast}
          onSeeHistory={() => setView('history')}
        />
      ) : (
        <HistoryView list={history} />
      )}
    </>
  );
}

/* ───────────────────────── Pending ───────────────────────── */

function PendingView({
  list, busy, selected, setSelected, bulkBusy, onApprove, onReject, onBulk, onToast, onSeeHistory,
}: {
  list: Req[];
  busy: Set<string>;
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  bulkBusy: boolean;
  onApprove: (r: Req, seasons?: number[] | 'all') => Promise<boolean>;
  onReject: (r: Req, reason?: string) => Promise<boolean>;
  onBulk: (k: 'approve' | 'reject') => void;
  onToast: (m: string, t?: 'success' | 'error') => void;
  onSeeHistory: () => void;
}) {
  if (list.length === 0) {
    return (
      <Empty title="Nothing waiting" body="Every request has been handled. New ones show up here and in the Requests badge.">
        <button type="button" className="ad-btn" onClick={onSeeHistory}>See history</button>
      </Empty>
    );
  }
  const allSelected = list.every((r) => selected.has(r.id));
  return (
    <>
      {list.length > 1 && (
        <div className="ad-chips" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="ad-chip"
            aria-pressed={allSelected}
            onClick={() => setSelected(allSelected ? new Set() : new Set(list.map((r) => r.id)))}
          >
            {allSelected ? 'Clear selection' : `Select all ${list.length}`}
          </button>
        </div>
      )}

      <div className="grid gap-2">
        {list.map((r) => (
          <PendingCard
            key={r.id}
            r={r}
            busy={busy.has(r.id)}
            checked={selected.has(r.id)}
            onCheck={(on) =>
              setSelected((prev) => {
                const n = new Set(prev);
                if (on) n.add(r.id);
                else n.delete(r.id);
                return n;
              })
            }
            onApprove={onApprove}
            onReject={onReject}
            onToast={onToast}
          />
        ))}
      </div>

      {selected.size > 0 && (
        <div className="ad-bulk" role="region" aria-label="Bulk actions">
          <span className="ad-text" style={{ fontWeight: 600 }}>{selected.size} selected</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSelected(new Set())} disabled={bulkBusy}>
            Clear
          </button>
          <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => onBulk('reject')} disabled={bulkBusy}>
            Reject
          </button>
          <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => onBulk('approve')} disabled={bulkBusy}>
            {bulkBusy ? 'Working…' : 'Approve'}
          </button>
        </div>
      )}
    </>
  );
}

function PendingCard({
  r, busy, checked, onCheck, onApprove, onReject, onToast,
}: {
  r: Req;
  busy: boolean;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onApprove: (r: Req, seasons?: number[] | 'all') => Promise<boolean>;
  onReject: (r: Req, reason?: string) => Promise<boolean>;
  onToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const year = r.releaseDate?.split('-')[0];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [seasonCount, setSeasonCount] = useState<number | null>(null);
  const [pickSeasons, setPickSeasons] = useState(false);
  const [seasons, setSeasons] = useState<Set<number>>(new Set());

  // Jumlah musim hanya diambil kalau admin membuka pemilih musim (hemat panggilan Jellyseerr)
  async function openSeasons() {
    setPickSeasons(true);
    if (seasonCount !== null) return;
    try {
      const res = await fetch(`/api/detail?type=tv&id=${r.tmdbId}`);
      const d = res.ok ? await res.json() : null;
      setSeasonCount(d?.numberOfSeasons ?? 0);
    } catch {
      setSeasonCount(0);
    }
  }

  async function doApprove() {
    const chosen = pickSeasons && seasons.size > 0 ? [...seasons].sort((a, b) => a - b) : 'all';
    const ok = await onApprove(r, r.mediaType === 'tv' ? chosen : undefined);
    if (ok) onToast(`${r.title} approved and sent to Jellyseerr`);
  }

  async function doReject() {
    const ok = await onReject(r, reason.trim() || undefined);
    if (ok) onToast(`${r.title} rejected`);
  }

  return (
    <article className="ad-tile">
      <div className="ad-row">
        <input
          type="checkbox"
          className="ad-check"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          aria-label={`Select ${r.title}`}
          style={{ marginTop: 4 }}
        />
        <Poster src={poster(r.posterPath)} size="lg" alt="" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="ad-h2">{r.title}</h2>
              <p className="ad-meta" style={{ marginTop: 4 }}>
                <span>{year ? `${year} · ` : ''}{r.mediaType === 'movie' ? 'Movie' : 'TV series'}</span>
                {r.rating ? (
                  <span className="inline-flex items-center gap-1">
                    <Icons.Star className="fill-current" /> {r.rating.toFixed(1)}
                  </span>
                ) : null}
              </p>
            </div>
            <Badge tone="yellow">Pending</Badge>
          </div>

          <p className="ad-meta" style={{ margin: '8px 0' }}>
            <span className="inline-flex items-center gap-1.5"><Icons.User /> {r.guest.name}</span>
            <span className="inline-flex items-center gap-1.5"><Icons.Clock /> {ago(r.requestedAt)}</span>
          </p>

          {r.overview && <p className="ad-small ad-muted ad-clamp" style={{ marginBottom: 10 }}>{r.overview}</p>}

          {r.guestNote && (
            <p className="ad-note" style={{ marginBottom: 12 }}>
              <b>Guest note: </b>
              {r.guestNote}
            </p>
          )}

          {r.mediaType === 'tv' && !rejecting && (
            <div style={{ marginBottom: 12 }}>
              {!pickSeasons ? (
                <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={openSeasons}>
                  Seasons: all · change
                </button>
              ) : seasonCount === null ? (
                <span className="ad-small ad-muted">Loading seasons…</span>
              ) : seasonCount === 0 ? (
                <span className="ad-small ad-muted">Season list unavailable; all seasons will be requested.</span>
              ) : (
                <div className="ad-chips" role="group" aria-label="Seasons to request">
                  <button type="button" className="ad-chip" aria-pressed={seasons.size === 0} onClick={() => setSeasons(new Set())}>
                    All seasons
                  </button>
                  {Array.from({ length: seasonCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="ad-chip"
                      aria-pressed={seasons.has(n)}
                      onClick={() =>
                        setSeasons((prev) => {
                          const next = new Set(prev);
                          if (next.has(n)) next.delete(n);
                          else next.add(n);
                          return next;
                        })
                      }
                    >
                      S{n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {rejecting ? (
            <div className="grid gap-2">
              <div className="ad-chips" role="group" aria-label="Quick reasons">
                {REJECT_REASONS.map((q) => (
                  <button key={q} type="button" className="ad-chip" aria-pressed={reason === q} onClick={() => setReason(reason === q ? '' : q)}>
                    {q}
                  </button>
                ))}
              </div>
              <input
                className="ad-field"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for the guest (optional)"
                maxLength={500}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ad-btn ad-btn--danger" onClick={doReject} disabled={busy}>
                  {busy ? 'Rejecting…' : 'Confirm reject'}
                </button>
                <button type="button" className="ad-btn ad-btn--ghost" onClick={() => { setRejecting(false); setReason(''); }} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button type="button" className="ad-btn ad-btn--primary" onClick={doApprove} disabled={busy}>
                {busy ? (
                  <>
                    <Icons.Loader2 className="animate-spin" /> Approving…
                  </>
                ) : (
                  <>
                    <Icons.Check /> Approve
                  </>
                )}
              </button>
              <button type="button" className="ad-btn" onClick={() => setRejecting(true)} disabled={busy}>
                <Icons.X /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────── History ───────────────────────── */

function HistoryView({ list }: { list: Req[] }) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(40);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    list.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!term) return true;
      return r.title.toLowerCase().includes(term) || r.guest.name.toLowerCase().includes(term);
    });
  }, [list, filter, q]);

  return (
    <>
      <div className="ad-search" style={{ marginBottom: 12 }}>
        <Icons.Search />
        <input
          className="ad-field"
          value={q}
          onChange={(e) => { setQ(e.target.value); setVisible(40); }}
          placeholder="Search by title or guest"
          aria-label="Search history"
        />
      </div>
      <div className="ad-chips" style={{ marginBottom: 16 }}>
        {HISTORY_FILTERS.map((f) => (
          <button key={f} type="button" className="ad-chip" aria-pressed={filter === f} onClick={() => { setFilter(f); setVisible(40); }}>
            {f === 'all' ? 'All' : REQUEST_STATUS[f].label} <b>{f === 'all' ? list.length : counts[f] ?? 0}</b>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon="Library" title="No requests found" body={q ? `Nothing matches "${q}".` : 'Try a different filter.'} />
      ) : (
        <div className="grid gap-2">
          {filtered.slice(0, visible).map((r) => {
            const s = REQUEST_STATUS[r.status] ?? { label: r.status, tone: 'neutral' as const };
            const year = r.releaseDate?.split('-')[0];
            return (
              <article key={r.id} className="ad-tile">
                <div className="ad-row">
                  <Poster src={poster(r.posterPath, 92)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="ad-text truncate" style={{ fontWeight: 600 }}>{r.title}</h2>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </div>
                    <p className="ad-meta" style={{ marginTop: 4 }}>
                      <span>{year ? `${year} · ` : ''}{r.mediaType === 'movie' ? 'Movie' : 'TV series'}</span>
                      <span>by {r.guest.name}</span>
                      <span>{ago(r.availableAt || r.rejectedAt || r.approvedAt || r.requestedAt)}</span>
                    </p>
                    {r.adminNote && <p className="ad-note" style={{ marginTop: 8 }}>{r.adminNote}</p>}
                  </div>
                </div>
              </article>
            );
          })}
          {filtered.length > visible && (
            <button type="button" className="ad-btn ad-btn--block" onClick={() => setVisible((v) => v + 40)}>
              Show more ({filtered.length - visible} left)
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<Skeletons n={3} h={140} />}>
      <RequestsInner />
    </Suspense>
  );
}
