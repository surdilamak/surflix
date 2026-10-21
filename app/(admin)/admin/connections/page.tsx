/**
 * Admin Reference (/admin/connections)
 *
 * Tiga tab:
 *  - Coverage: seluruh library, ditandai mana yang sudah punya peta. Buka satu judul untuk melihat, mengubah,
 *    menghapus, atau menambah koneksi.
 *  - Review queue: koneksi yang belum di-approve (approve satu per satu atau massal, bisa difilter per jenis).
 *  - Rejected: koneksi yang ditolak, bisa dipulihkan.
 */
'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/ui/icons';
import { useAdmin } from '@/components/admin/context';
import { Badge, Empty, PageHead, Poster, Skeletons } from '@/components/admin/ui';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { usePortal } from '@/lib/hooks/use-portal';
import { posterUrl } from '@/lib/jellyfin';
import { relLabel, REL_ORDER } from '@/lib/i18n';
import { CONNECTION_STATUS } from '@/lib/admin-format';

interface CoverageTitle {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  jellyfinId: string;
  genres: string | null;
  directors: string | null;
  approved: number;
  pending: number;
}

interface Summary {
  total: number;
  mapped: number;
  pendingOnly: number;
  unmapped: number;
}

interface Conn {
  id: string;
  sourceTmdbId: number;
  sourceMediaType: string;
  sourceTitle: string;
  sourceYear: number | null;
  sourceJellyfinId?: string | null;
  targetTmdbId: number;
  targetMediaType: string;
  targetTitle: string;
  targetYear: number | null;
  targetJellyfinId?: string | null;
  relationship: string;
  reason: string;
  reasonEn: string | null;
  confidence: string;
  status: string;
  source: string;
}

interface SearchHit {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
}

type Tab = 'coverage' | 'queue' | 'rejected';
type Filter = 'all' | 'mapped' | 'pending' | 'unmapped';

function ConnectionsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const config = useAppConfig();
  const { referenceHref } = usePortal();
  const { api, toast, confirm, refreshCounts } = useAdmin();

  const tab: Tab = sp.get('tab') === 'queue' ? 'queue' : sp.get('tab') === 'rejected' ? 'rejected' : 'coverage';
  const setTab = (t: Tab) => {
    const params = new URLSearchParams(sp.toString());
    if (t === 'coverage') params.delete('tab');
    else params.set('tab', t);
    router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false });
  };

  const [titles, setTitles] = useState<CoverageTitle[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [kind, setKind] = useState<'all' | 'movie' | 'tv'>('all');
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(60);
  const [open, setOpen] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [queue, setQueue] = useState<Conn[] | null>(null);
  const [rejected, setRejected] = useState<Conn[] | null>(null);
  const [relFilter, setRelFilter] = useState<string>('all');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const jf = (id?: string | null, w = 120) => (id && config?.jellyfinUrl ? posterUrl(id, config.jellyfinUrl, w) : null);

  const loadCoverage = useCallback(async () => {
    const { res, data } = await api('/api/admin/library');
    if (res.ok) {
      setTitles(data.titles);
      setSummary(data.summary);
    }
    setLoading(false);
  }, [api]);

  const loadQueue = useCallback(async () => {
    const { res, data } = await api('/api/admin/connections?status=PENDING_REVIEW&limit=1000');
    if (res.ok) setQueue(data.connections);
  }, [api]);

  const loadRejected = useCallback(async () => {
    const { res, data } = await api('/api/admin/connections?status=REJECTED&limit=1000');
    if (res.ok) setRejected(data.connections);
  }, [api]);

  useEffect(() => {
    loadCoverage();
    loadQueue();
    loadRejected();
  }, [loadCoverage, loadQueue, loadRejected]);

  const refreshAll = () => Promise.all([loadCoverage(), loadQueue(), loadRejected(), refreshCounts()]);

  async function act(id: string, action: 'approve' | 'reject') {
    setActioningId(id);
    const { res, data } = await api('/api/admin/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    setActioningId(null);
    if (!res.ok) return toast(data.error || 'Failed', 'error');
    toast(action === 'approve' ? 'Approved. It is live on Reference.' : 'Rejected');
    refreshAll();
  }

  async function bulkApprove(list: Conn[]) {
    const ok = await confirm({
      title: `Approve ${list.length} connection${list.length === 1 ? '' : 's'}?`,
      body: 'They go live on Reference right away.',
      confirmLabel: `Approve ${list.length}`,
    });
    if (!ok) return;
    setBulkBusy(true);
    let done = 0;
    for (const c of list) {
      const { res } = await api('/api/admin/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, action: 'approve' }),
      });
      if (res.ok) done++;
    }
    setBulkBusy(false);
    toast(`${done} of ${list.length} approved`, done === list.length ? 'success' : 'error');
    refreshAll();
  }

  async function sync() {
    setSyncing(true);
    const { res, data } = await api('/api/admin/library/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setSyncing(false);
    if (!res.ok) return toast(data.error || 'Sync failed', 'error');
    toast(`Library synced: ${data.created} new, ${data.updated} updated`);
    refreshAll();
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return titles.filter((t) => {
      if (kind !== 'all' && t.mediaType !== kind) return false;
      if (filter === 'mapped' && t.approved === 0) return false;
      if (filter === 'pending' && !(t.approved === 0 && t.pending > 0)) return false;
      if (filter === 'unmapped' && !(t.approved === 0 && t.pending === 0)) return false;
      if (!term) return true;
      return t.title.toLowerCase().includes(term) || (t.directors ?? '').toLowerCase().includes(term) || String(t.year ?? '').includes(term);
    });
  }, [titles, filter, kind, q]);

  const queueShown = useMemo(() => (queue ?? []).filter((c) => relFilter === 'all' || c.relationship === relFilter), [queue, relFilter]);
  const queueRelCounts = useMemo(() => {
    const m: Record<string, number> = {};
    (queue ?? []).forEach((c) => (m[c.relationship] = (m[c.relationship] ?? 0) + 1));
    return m;
  }, [queue]);

  return (
    <>
      <PageHead title="Reference maps" sub="Every title in the library, and the connections between them.">
        <a href={referenceHref('/')} target="_blank" rel="noopener" className="ad-btn ad-btn--sm">
          <Icons.ArrowUpRight /> Open portal
        </a>
        <button type="button" className="ad-btn ad-btn--sm" onClick={sync} disabled={syncing} title="Pull titles from Jellyfin into the snapshot">
          <Icons.RefreshCw className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync library'}
        </button>
      </PageHead>

      <div className="ad-seg" role="group" aria-label="View" style={{ marginBottom: 16 }}>
        <button type="button" aria-pressed={tab === 'coverage'} onClick={() => setTab('coverage')}>
          Coverage{summary ? ` (${summary.total})` : ''}
        </button>
        <button type="button" aria-pressed={tab === 'queue'} onClick={() => setTab('queue')}>
          Review queue{queue ? ` (${queue.length})` : ''}
        </button>
        <button type="button" aria-pressed={tab === 'rejected'} onClick={() => setTab('rejected')}>
          Rejected{rejected ? ` (${rejected.length})` : ''}
        </button>
      </div>

      {/* ───────── Coverage ───────── */}
      {tab === 'coverage' && (
        <>
          {summary && (
            <div className="ad-chips" style={{ marginBottom: 12 }}>
              {(
                [
                  ['all', 'All titles', summary.total],
                  ['mapped', 'Mapped', summary.mapped],
                  ['pending', 'Waiting for review', summary.pendingOnly],
                  ['unmapped', 'Not mapped yet', summary.unmapped],
                ] as const
              ).map(([k, label, n]) => (
                <button key={k} type="button" className="ad-chip" aria-pressed={filter === k} onClick={() => { setFilter(k); setVisible(60); }}>
                  {label} <b>{n}</b>
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]" style={{ marginBottom: 16 }}>
            <div className="ad-search">
              <Icons.Search />
              <input
                className="ad-field"
                value={q}
                onChange={(e) => { setQ(e.target.value); setVisible(60); }}
                placeholder="Search by title, director or year"
                aria-label="Search the library"
              />
            </div>
            <div className="ad-seg" role="group" aria-label="Type">
              {(['all', 'movie', 'tv'] as const).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setVisible(60); }}>
                  {k === 'all' ? 'All' : k === 'movie' ? 'Films' : 'Series'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <Skeletons n={6} h={76} />
          ) : filtered.length === 0 ? (
            <Empty
              icon="Library"
              title={titles.length === 0 ? 'The library snapshot is empty' : 'No titles match'}
              body={titles.length === 0 ? 'Run Sync library to pull the titles from Jellyfin.' : 'Try a different filter or search.'}
            />
          ) : (
            <div className="grid gap-2">
              {filtered.slice(0, visible).map((t) => {
                const key = `${t.mediaType}:${t.tmdbId}`;
                const isOpen = open === key;
                return (
                  <div key={key} className="ad-tile ad-tile--flush">
                    <div className="flex flex-wrap items-center gap-3" style={{ padding: 12 }}>
                      <Poster src={jf(t.jellyfinId)} />
                      <div className="min-w-0 flex-1" style={{ minWidth: '10rem' }}>
                        <p className="ad-text truncate" style={{ fontWeight: 600 }}>
                          {t.title}
                          {t.year && <span className="ad-muted" style={{ fontWeight: 400, marginLeft: 8 }}>{t.year}</span>}
                          {t.mediaType === 'tv' && <span style={{ marginLeft: 8 }}><Badge>Series</Badge></span>}
                        </p>
                        <p className="ad-small ad-muted truncate">{t.directors || t.genres || ''}</p>
                        <p className="ad-small" style={{ marginTop: 2 }}>
                          {t.approved > 0 ? (
                            <span style={{ color: 'var(--ad-green)' }}>{t.approved} live</span>
                          ) : t.pending === 0 ? (
                            <span className="ad-muted">Not mapped</span>
                          ) : null}
                          {t.pending > 0 && (
                            <span style={{ color: 'var(--ad-yellow)', marginLeft: t.approved > 0 ? 10 : 0 }}>{t.pending} waiting</span>
                          )}
                        </p>
                      </div>
                      <a href={referenceHref(`/${t.mediaType}/${t.tmdbId}`)} target="_blank" rel="noopener" className="ad-btn ad-btn--sm">
                        View
                      </a>
                      <button type="button" className={`ad-btn ad-btn--sm ${isOpen ? '' : 'ad-btn--primary'}`} onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}>
                        {isOpen ? 'Close' : 'Manage'}
                      </button>
                    </div>
                    {isOpen && <FilmManager title={t} onChanged={refreshAll} />}
                  </div>
                );
              })}
              {filtered.length > visible && (
                <button type="button" className="ad-btn ad-btn--block" onClick={() => setVisible((v) => v + 60)}>
                  Show more ({filtered.length - visible} left)
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ───────── Review queue ───────── */}
      {tab === 'queue' && (
        queue === null ? (
          <Skeletons n={3} h={110} />
        ) : queue.length === 0 ? (
          <Empty title="The queue is empty" body="Everything waiting has been reviewed." />
        ) : (
          <>
            <p className="ad-small ad-muted" style={{ marginBottom: 12, maxWidth: '40rem' }}>
              These connections are less certain. Read the reason, check it if you can, then approve or reject.
            </p>
            <div className="ad-chips" style={{ marginBottom: 12 }}>
              <button type="button" className="ad-chip" aria-pressed={relFilter === 'all'} onClick={() => setRelFilter('all')}>
                All <b>{queue.length}</b>
              </button>
              {REL_ORDER.filter((r) => queueRelCounts[r]).map((r) => (
                <button key={r} type="button" className="ad-chip" aria-pressed={relFilter === r} onClick={() => setRelFilter(r)}>
                  {relLabel('en', r)} <b>{queueRelCounts[r]}</b>
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              {queueShown.map((c) => (
                <ConnCard
                  key={c.id}
                  c={c}
                  jf={jf}
                  busy={actioningId === c.id}
                  actions={
                    <>
                      <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" disabled={actioningId === c.id} onClick={() => act(c.id, 'approve')}>
                        <Icons.Check /> Approve
                      </button>
                      <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" disabled={actioningId === c.id} onClick={() => act(c.id, 'reject')}>
                        <Icons.X /> Reject
                      </button>
                    </>
                  }
                />
              ))}
            </div>
            <div className="ad-bulk">
              <span className="ad-small ad-muted">
                {relFilter === 'all' ? `${queue.length} waiting` : `${queueShown.length} ${relLabel('en', relFilter).toLowerCase()} waiting`}
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" disabled={bulkBusy} onClick={() => bulkApprove(queueShown)}>
                {bulkBusy ? 'Approving…' : `Approve ${queueShown.length === queue.length ? 'all' : 'these'} ${queueShown.length}`}
              </button>
            </div>
          </>
        )
      )}

      {/* ───────── Rejected ───────── */}
      {tab === 'rejected' && (
        rejected === null ? (
          <Skeletons n={3} h={110} />
        ) : rejected.length === 0 ? (
          <Empty title="Nothing rejected" body="Connections you reject land here, so you can bring them back." />
        ) : (
          <>
            <p className="ad-small ad-muted" style={{ marginBottom: 12 }}>
              Rejected connections stay hidden from the portal. Restore one to put it back live.
            </p>
            <div className="grid gap-2">
              {rejected.map((c) => (
                <ConnCard
                  key={c.id}
                  c={c}
                  jf={jf}
                  busy={actioningId === c.id}
                  actions={
                    <button type="button" className="ad-btn ad-btn--sm" disabled={actioningId === c.id} onClick={() => act(c.id, 'approve')}>
                      <Icons.RotateCcw /> Restore
                    </button>
                  }
                />
              ))}
            </div>
          </>
        )
      )}
    </>
  );
}

function ConnCard({ c, jf, busy, actions }: { c: Conn; jf: (id?: string | null, w?: number) => string | null; busy: boolean; actions: React.ReactNode }) {
  return (
    <article className="ad-tile" aria-busy={busy}>
      <div className="ad-row">
        <div className="flex shrink-0 gap-1.5">
          <Poster src={jf(c.sourceJellyfinId)} />
          <Poster src={jf(c.targetJellyfinId)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="ad-text" style={{ fontWeight: 600 }}>
            {c.sourceTitle}
            {c.sourceYear && <span className="ad-muted" style={{ fontWeight: 400 }}> {c.sourceYear}</span>}
            <span className="ad-muted" style={{ margin: '0 8px' }}>→</span>
            {c.targetTitle}
            {c.targetYear && <span className="ad-muted" style={{ fontWeight: 400 }}> {c.targetYear}</span>}
          </p>
          <p className="flex flex-wrap items-center gap-2" style={{ margin: '6px 0' }}>
            <Badge>{relLabel('en', c.relationship, 'out')}</Badge>
            {c.confidence === 'medium' && <Badge tone="yellow">Less certain</Badge>}
            {c.source === 'admin' && <span className="ad-small ad-muted">added by you</span>}
          </p>
          <p className="ad-small" style={{ color: 'rgba(255,255,255,0.82)' }}>{c.reasonEn || c.reason}</p>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>{actions}</div>
        </div>
      </div>
    </article>
  );
}

function FilmManager({ title, onChanged }: { title: CoverageTitle; onChanged: () => void }) {
  const { api, toast, confirm } = useAdmin();
  const me = `${title.mediaType}:${title.tmdbId}`;
  const [conns, setConns] = useState<Conn[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRel, setEditRel] = useState('');
  const [editText, setEditText] = useState('');

  const [dir, setDir] = useState<'out' | 'in'>('out');
  const [rel, setRel] = useState<string>('homage');
  const [tq, setTq] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [target, setTarget] = useState<SearchHit | null>(null);
  const [reasonEn, setReasonEn] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { res, data } = await api(`/api/admin/connections?film=${me}&status=ALL&limit=500`);
    if (res.ok) setConns(data.connections);
  }, [api, me]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const term = tq.trim();
    if (term.length < 2 || target) {
      setHits([]);
      return;
    }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/library/search?q=${encodeURIComponent(term)}`);
      const data = await res.json().catch(() => ({}));
      setHits((data.results ?? []).filter((h: SearchHit) => `${h.mediaType}:${h.tmdbId}` !== me).slice(0, 6));
    }, 180);
    return () => clearTimeout(id);
  }, [tq, target, me]);

  async function act(id: string, action: 'approve' | 'reject' | 'delete') {
    if (action === 'delete') {
      const ok = await confirm({ title: 'Delete this connection?', body: 'It is removed for good. Reject it instead if you may want it back.', confirmLabel: 'Delete', danger: true });
      if (!ok) return;
    }
    setBusy(id);
    const { res, data } = await api('/api/admin/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    setBusy(null);
    if (!res.ok) return toast(data.error || 'Failed', 'error');
    await load();
    onChanged();
  }

  async function saveEdit(id: string) {
    setBusy(id);
    const { res, data } = await api('/api/admin/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'update', relationship: editRel, reasonEn: editText }),
    });
    setBusy(null);
    if (!res.ok) return toast(data.error || 'Failed', 'error');
    setEditing(null);
    toast('Saved');
    await load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return toast('Pick a title from the search results first', 'error');
    setSaving(true);
    const self = { tmdbId: title.tmdbId, mediaType: title.mediaType };
    const other = { tmdbId: target.tmdbId, mediaType: target.mediaType };
    const { res, data } = await api('/api/admin/connections/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: dir === 'out' ? self : other,
        target: dir === 'out' ? other : self,
        relationship: rel,
        reasonEn,
        reason: reasonId || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(data.error || 'Failed', 'error');
    toast('Connection added and live');
    setTarget(null);
    setTq('');
    setReasonEn('');
    setReasonId('');
    await load();
    onChanged();
  }

  return (
    <div style={{ padding: '4px 12px 16px' }}>
      <p className="ad-label" style={{ margin: '8px 0' }}>Connections</p>
      {conns === null ? (
        <div className="ad-skel" style={{ height: 48 }} />
      ) : conns.length === 0 ? (
        <p className="ad-small ad-muted" style={{ marginBottom: 16 }}>Nothing yet. Add the first connection below.</p>
      ) : (
        <div className="grid gap-2" style={{ marginBottom: 20 }}>
          {conns.map((c) => {
            const out = `${c.sourceMediaType}:${c.sourceTmdbId}` === me;
            const other = out ? c.targetTitle : c.sourceTitle;
            const otherYear = out ? c.targetYear : c.sourceYear;
            const st = CONNECTION_STATUS[c.status] ?? { label: c.status, tone: 'neutral' as const };
            const isEditing = editing === c.id;
            return (
              <div key={c.id} className="ad-note" style={{ padding: 12 }}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span style={{ fontWeight: 600 }}>
                    {other}
                    {otherYear && <span className="ad-muted" style={{ fontWeight: 400 }}> {otherYear}</span>}
                  </span>
                  <span className="ad-muted">{relLabel('en', c.relationship, out ? 'out' : 'in')}</span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {c.source === 'admin' && <span className="ad-muted">added by you</span>}
                </div>

                {isEditing ? (
                  <div className="grid gap-2" style={{ marginTop: 10 }}>
                    <select value={editRel} onChange={(e) => setEditRel(e.target.value)} className="ad-field" aria-label="Relationship">
                      {REL_ORDER.map((r) => (
                        <option key={r} value={r}>{relLabel('en', r)}</option>
                      ))}
                    </select>
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="ad-field" aria-label="Reason" />
                    <div className="flex gap-2">
                      <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => saveEdit(c.id)} disabled={busy === c.id}>Save</button>
                      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '8px 0', color: 'rgba(255,255,255,0.82)' }}>{c.reasonEn || c.reason}</p>
                    <div className="flex flex-wrap gap-2">
                      {c.status !== 'APPROVED' && (
                        <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => act(c.id, 'approve')} disabled={busy === c.id}>
                          {c.status === 'REJECTED' ? 'Restore' : 'Approve'}
                        </button>
                      )}
                      {c.status !== 'REJECTED' && (
                        <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => act(c.id, 'reject')} disabled={busy === c.id}>Reject</button>
                      )}
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm"
                        onClick={() => { setEditing(c.id); setEditRel(c.relationship); setEditText(c.reasonEn || c.reason); }}
                      >
                        Edit
                      </button>
                      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => act(c.id, 'delete')} disabled={busy === c.id}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="ad-label" style={{ margin: '8px 0' }}>Add a connection</p>
      <form onSubmit={add} className="grid gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={dir} onChange={(e) => setDir(e.target.value as 'out' | 'in')} className="ad-field" aria-label="Direction">
            <option value="out">{title.title} references the title below</option>
            <option value="in">The title below references {title.title}</option>
          </select>
          <select value={rel} onChange={(e) => setRel(e.target.value)} className="ad-field" aria-label="Relationship">
            {REL_ORDER.map((r) => (
              <option key={r} value={r}>{relLabel('en', r)}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          {target ? (
            <div className="ad-field flex items-center justify-between" style={{ background: 'var(--ad-raised)' }}>
              <span>
                <b>{target.title}</b>
                {target.year && <span className="ad-muted"> {target.year}</span>}
              </span>
              <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setTarget(null)}>Change</button>
            </div>
          ) : (
            <>
              <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Search the library for the other title" className="ad-field" aria-label="Other title" />
              {hits.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-20" style={{ marginTop: 4, padding: 4, listStyle: 'none', background: 'var(--ad-hover)', borderRadius: 8 }}>
                  {hits.map((h) => (
                    <li key={`${h.mediaType}-${h.tmdbId}`}>
                      <button
                        type="button"
                        className="ad-btn ad-btn--ghost ad-btn--block"
                        style={{ justifyContent: 'flex-start' }}
                        onClick={() => { setTarget(h); setHits([]); }}
                      >
                        {h.title}
                        {h.year && <span className="ad-muted">{h.year}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <textarea
          value={reasonEn}
          onChange={(e) => setReasonEn(e.target.value)}
          rows={3}
          placeholder="Why do they connect? One or two plain sentences, only what you can back up."
          className="ad-field"
          required
          minLength={5}
          maxLength={220}
          aria-label="Reason in English"
        />
        <input value={reasonId} onChange={(e) => setReasonId(e.target.value)} placeholder="Indonesian version (optional)" className="ad-field" maxLength={220} aria-label="Reason in Indonesian" />
        <div>
          <button type="submit" className="ad-btn ad-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Add connection'}</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminConnectionsPage() {
  return (
    <Suspense fallback={<Skeletons n={4} h={96} />}>
      <ConnectionsInner />
    </Suspense>
  );
}
