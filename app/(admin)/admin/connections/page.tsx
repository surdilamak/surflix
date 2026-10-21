/**
 * Admin Referensi (/admin/connections)
 *
 * Dua tab:
 *  - Coverage: seluruh library, ditandai mana yang sudah punya peta referensi dan mana yang belum.
 *    Admin bisa buka satu judul, lihat koneksinya, edit/hapus, dan nambah koneksi manual.
 *  - Review queue: draft yang belum di-approve (confidence "medium"), approve satu-satu atau massal.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { posterUrl } from '@/lib/jellyfin';
import { relLabel, REL_ORDER } from '@/lib/i18n';

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
  targetTmdbId: number;
  targetMediaType: string;
  targetTitle: string;
  targetYear: number | null;
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

type Filter = 'all' | 'mapped' | 'pending' | 'unmapped';
type Toast = { message: string; type: 'success' | 'error' } | null;

const STATUS_CLS: Record<string, string> = {
  APPROVED: 'bg-ios-green/20 text-ios-green',
  PENDING_REVIEW: 'bg-ios-orange/20 text-ios-orange',
  REJECTED: 'bg-ios-red/20 text-ios-red',
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const post = (path: string, body: unknown) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function AdminConnectionsPage() {
  const router = useRouter();
  const config = useAppConfig();
  const [tab, setTab] = useState<'coverage' | 'queue'>('coverage');
  const [toast, setToast] = useState<Toast>(null);

  const [titles, setTitles] = useState<CoverageTitle[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(60);
  const [open, setOpen] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [queue, setQueue] = useState<Conn[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadCoverage() {
    const { res, data } = await api('/api/admin/library');
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      setTitles(data.titles);
      setSummary(data.summary);
    }
    setLoading(false);
  }

  async function loadQueue() {
    const { res, data } = await api('/api/admin/connections?status=PENDING_REVIEW&limit=1000');
    if (res.status === 401) return router.push('/login');
    if (res.ok) setQueue(data.connections);
    setQueueLoading(false);
  }

  useEffect(() => {
    loadCoverage();
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshAll() {
    await Promise.all([loadCoverage(), loadQueue()]);
  }

  async function handleQueueAction(id: string, action: 'approve' | 'reject') {
    setActioningId(id);
    const { res, data } = await post('/api/admin/connections', { id, action });
    setActioningId(null);
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    showToast(action === 'approve' ? 'Approved' : 'Rejected', 'success');
    setQueue((prev) => prev.filter((c) => c.id !== id));
    loadCoverage();
  }

  async function handleBulkApprove() {
    if (!confirm(`Approve all ${queue.length} waiting connections? They go live on the portal right away.`)) return;
    setBulkBusy(true);
    const { res, data } = await post('/api/admin/connections', { action: 'bulk-approve' });
    setBulkBusy(false);
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    showToast(`${data.updated} connections approved`, 'success');
    refreshAll();
  }

  async function handleSync() {
    setSyncing(true);
    const { res, data } = await post('/api/admin/library/sync', {});
    setSyncing(false);
    if (!res.ok) return showToast(data.error || 'Sync failed', 'error');
    showToast(`Library synced: ${data.created} new, ${data.updated} updated`, 'success');
    loadCoverage();
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/login');
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return titles.filter((t) => {
      if (filter === 'mapped' && t.approved === 0) return false;
      if (filter === 'pending' && !(t.approved === 0 && t.pending > 0)) return false;
      if (filter === 'unmapped' && !(t.approved === 0 && t.pending === 0)) return false;
      if (!term) return true;
      return t.title.toLowerCase().includes(term) || (t.directors ?? '').toLowerCase().includes(term);
    });
  }, [titles, filter, q]);

  const portalLink = (t: { mediaType: string; tmdbId: number }) => `/referensi/${t.mediaType}/${t.tmdbId}`;

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-black/70 backdrop-blur-ios">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Image src="/logo-mark.png" alt="Surflix" width={24} height={24} className="h-6 w-6" />
              <span className="text-base font-semibold tracking-tighter">Surflix Admin</span>
            </div>
            <nav className="hidden gap-1 md:flex">
              <Link href="/admin" className="tab">Dashboard</Link>
              <Link href="/admin/pending" className="tab">Pending</Link>
              <Link href="/admin/history" className="tab">History</Link>
              <Link href="/admin/connections" className="tab tab-active">
                Reference
                {queue.length > 0 && (
                  <span className="ml-1 rounded-full bg-surflix-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {queue.length}
                  </span>
                )}
              </Link>
              <Link href="/admin/settings" className="tab">Settings</Link>
            </nav>
          </div>
          <button onClick={handleLogout} className="text-xs text-white/40 hover:text-white">
            <Icons.LogOut className="mr-1 inline h-3 w-3" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tighter md:text-3xl">Reference maps</h1>
            <p className="mt-1 text-xs text-white/50">
              Every title in the library, and which ones already have connections.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/referensi"
              target="_blank"
              rel="noopener"
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/15"
            >
              Open portal
            </a>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-50"
              title="Pull titles from Jellyfin into the snapshot (needs JELLYFIN_URL and JELLYFIN_API_KEY on the server)"
            >
              {syncing ? 'Syncing…' : 'Sync library'}
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-full bg-white/6 p-1 text-xs font-medium">
          {([
            ['coverage', `Coverage${summary ? ` (${summary.total})` : ''}`],
            ['queue', `Review queue (${queue.length})`],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full px-4 py-2 transition-colors ${
                tab === k ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'coverage' ? (
          <>
            {summary && (
              <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                {([
                  ['all', 'All titles', summary.total, 'text-white'],
                  ['mapped', 'Mapped', summary.mapped, 'text-ios-green'],
                  ['pending', 'Waiting for review', summary.pendingOnly, 'text-ios-orange'],
                  ['unmapped', 'Not mapped yet', summary.unmapped, 'text-white/50'],
                ] as const).map(([k, label, n, cls]) => (
                  <button
                    key={k}
                    onClick={() => {
                      setFilter(k);
                      setVisible(60);
                    }}
                    className={`rounded-ios-lg border p-3 text-left transition-colors ${
                      filter === k ? 'border-white/40 bg-white/8' : 'border-white/8 bg-bg-surface hover:border-white/20'
                    }`}
                  >
                    <p className={`text-xl font-semibold tracking-tight ${cls}`}>{n}</p>
                    <p className="text-[11px] text-white/50">{label}</p>
                  </button>
                ))}
              </div>
            )}

            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setVisible(60);
              }}
              placeholder="Search by title or director"
              className="input-ios mb-4 w-full text-xs"
            />

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-ios-lg bg-white/4" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-white/50">
                {titles.length === 0 ? 'The library snapshot is empty. Use Sync library.' : 'No titles match.'}
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.slice(0, visible).map((t) => {
                  const key = `${t.mediaType}:${t.tmdbId}`;
                  const isOpen = open === key;
                  return (
                    <div key={key} className="rounded-ios-lg border border-white/8 bg-bg-surface">
                      <div className="flex items-center gap-3 p-3">
                        <div className="h-14 w-9 shrink-0 overflow-hidden rounded-sm bg-bg-elevated">
                          {config?.jellyfinUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={posterUrl(t.jellyfinId, config.jellyfinUrl, 120)}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-tight">
                            {t.title}
                            {t.year && <span className="ml-1.5 text-xs font-normal text-white/40">{t.year}</span>}
                            {t.mediaType === 'tv' && (
                              <span className="ml-1.5 rounded-sm bg-white/10 px-1 text-[10px] font-medium text-white/60">TV</span>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-white/40">{t.directors || t.genres || ''}</p>
                        </div>
                        <div className="hidden shrink-0 text-right text-[11px] sm:block">
                          {t.approved > 0 ? (
                            <span className="font-medium text-ios-green">{t.approved} live</span>
                          ) : t.pending > 0 ? (
                            <span className="font-medium text-ios-orange">{t.pending} waiting</span>
                          ) : (
                            <span className="text-white/40">Not mapped</span>
                          )}
                          {t.approved > 0 && t.pending > 0 && (
                            <span className="ml-2 text-ios-orange">+{t.pending} waiting</span>
                          )}
                        </div>
                        <a
                          href={portalLink(t)}
                          target="_blank"
                          rel="noopener"
                          className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/15"
                        >
                          View
                        </a>
                        <button
                          onClick={() => setOpen(isOpen ? null : key)}
                          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-black"
                        >
                          {isOpen ? 'Close' : 'Manage'}
                        </button>
                      </div>
                      {isOpen && (
                        <FilmManager
                          title={t}
                          onChanged={() => {
                            loadCoverage();
                            loadQueue();
                          }}
                          showToast={showToast}
                        />
                      )}
                    </div>
                  );
                })}
                {filtered.length > visible && (
                  <button
                    onClick={() => setVisible((v) => v + 60)}
                    className="w-full rounded-full bg-white/10 py-2.5 text-xs font-medium text-white hover:bg-white/15"
                  >
                    Show more ({filtered.length - visible} left)
                  </button>
                )}
              </div>
            )}
          </>
        ) : queueLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-ios-lg bg-white/4" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/50">The queue is empty. Everything waiting has been reviewed.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs text-white/50">
                These are connections we are less sure about. Read the reason, check it if you can, then approve or reject.
              </p>
              <button
                onClick={handleBulkApprove}
                disabled={bulkBusy}
                className="shrink-0 rounded-full bg-ios-green px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {bulkBusy ? 'Approving…' : `Approve all ${queue.length}`}
              </button>
            </div>
            <div className="space-y-2">
              {queue.map((c) => (
                <QueueRow
                  key={c.id}
                  c={c}
                  busy={actioningId === c.id}
                  onAction={(a) => handleQueueAction(c.id, a)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {toast && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed left-1/2 top-4 z-200 -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-ios">
            {toast.type === 'success' ? (
              <Icons.CheckCircle2 className="h-4 w-4 text-ios-green" />
            ) : (
              <Icons.XCircle className="h-4 w-4 text-ios-red" />
            )}
            <span className="text-[13px] font-medium">{toast.message}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function QueueRow({ c, busy, onAction }: { c: Conn; busy: boolean; onAction: (a: 'approve' | 'reject') => void }) {
  return (
    <div className="rounded-ios-lg border border-white/8 bg-bg-surface p-3.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-sm font-semibold tracking-tight">
          {c.sourceTitle}
          <span className="mx-1.5 font-normal text-white/30">→</span>
          {c.targetTitle}
        </p>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
          {relLabel('en', c.relationship, 'out')}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/70">{c.reasonEn || c.reason}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onAction('approve')}
          disabled={busy}
          className="rounded-full bg-ios-green px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => onAction('reject')}
          disabled={busy}
          className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-ios-red/20 hover:text-ios-red disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function FilmManager({
  title,
  onChanged,
  showToast,
}: {
  title: CoverageTitle;
  onChanged: () => void;
  showToast: (m: string, t: 'success' | 'error') => void;
}) {
  const me = `${title.mediaType}:${title.tmdbId}`;
  const [conns, setConns] = useState<Conn[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRel, setEditRel] = useState('');
  const [editText, setEditText] = useState('');

  // form tambah
  const [dir, setDir] = useState<'out' | 'in'>('out');
  const [rel, setRel] = useState<string>('homage');
  const [tq, setTq] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [target, setTarget] = useState<SearchHit | null>(null);
  const [reasonEn, setReasonEn] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const { res, data } = await api(`/api/admin/connections?film=${me}&status=ALL&limit=500`);
    if (res.ok) setConns(data.connections);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    const term = tq.trim();
    if (term.length < 2 || target) {
      setHits([]);
      return;
    }
    const id = setTimeout(async () => {
      const { data } = await api(`/api/library/search?q=${encodeURIComponent(term)}`);
      setHits((data.results ?? []).filter((h: SearchHit) => `${h.mediaType}:${h.tmdbId}` !== me).slice(0, 6));
    }, 180);
    return () => clearTimeout(id);
  }, [tq, target, me]);

  async function act(id: string, action: 'approve' | 'reject' | 'delete') {
    if (action === 'delete' && !confirm('Delete this connection?')) return;
    setBusy(id);
    const { res, data } = await post('/api/admin/connections', { id, action });
    setBusy(null);
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    await load();
    onChanged();
  }

  async function saveEdit(id: string) {
    setBusy(id);
    const { res, data } = await post('/api/admin/connections', {
      id,
      action: 'update',
      relationship: editRel,
      reasonEn: editText,
    });
    setBusy(null);
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    setEditing(null);
    showToast('Saved', 'success');
    await load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return showToast('Pick a title from the search results first', 'error');
    setSaving(true);
    const self = { tmdbId: title.tmdbId, mediaType: title.mediaType };
    const other = { tmdbId: target.tmdbId, mediaType: target.mediaType };
    const { res, data } = await post('/api/admin/connections/create', {
      source: dir === 'out' ? self : other,
      target: dir === 'out' ? other : self,
      relationship: rel,
      reasonEn,
      reason: reasonId || undefined,
    });
    setSaving(false);
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    showToast('Connection added and live', 'success');
    setTarget(null);
    setTq('');
    setReasonEn('');
    setReasonId('');
    await load();
    onChanged();
  }

  return (
    <div className="border-t border-white/8 p-3.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">Connections</p>
      {conns === null ? (
        <div className="h-10 animate-pulse rounded-sm bg-white/4" />
      ) : conns.length === 0 ? (
        <p className="mb-4 text-xs text-white/40">Nothing yet. Add the first connection below.</p>
      ) : (
        <div className="mb-5 space-y-2">
          {conns.map((c) => {
            const out = `${c.sourceMediaType}:${c.sourceTmdbId}` === me;
            const other = out ? c.targetTitle : c.sourceTitle;
            const otherYear = out ? c.targetYear : c.sourceYear;
            const isEditing = editing === c.id;
            return (
              <div key={c.id} className="rounded-lg bg-white/4 p-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold">
                    {other}
                    {otherYear && <span className="ml-1 font-normal text-white/40">{otherYear}</span>}
                  </span>
                  <span className="text-white/50">{relLabel('en', c.relationship, out ? 'out' : 'in')}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLS[c.status] ?? 'bg-white/10'}`}>
                    {c.status === 'PENDING_REVIEW' ? 'waiting' : c.status.toLowerCase()}
                  </span>
                  {c.source === 'admin' && <span className="text-[10px] text-white/40">added by admin</span>}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <select value={editRel} onChange={(e) => setEditRel(e.target.value)} className="input-ios w-full text-xs">
                      {REL_ORDER.map((r) => (
                        <option key={r} value={r}>
                          {relLabel('en', r)}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="input-ios w-full text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        disabled={busy === c.id}
                        className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-black disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditing(null)} className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/65">{c.reasonEn || c.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.status !== 'APPROVED' && (
                        <button
                          onClick={() => act(c.id, 'approve')}
                          disabled={busy === c.id}
                          className="rounded-full bg-ios-green px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {c.status !== 'REJECTED' && (
                        <button
                          onClick={() => act(c.id, 'reject')}
                          disabled={busy === c.id}
                          className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-ios-red/20 hover:text-ios-red disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditing(c.id);
                          setEditRel(c.relationship);
                          setEditText(c.reasonEn || c.reason);
                        }}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/15"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => act(c.id, 'delete')}
                        disabled={busy === c.id}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60 hover:text-ios-red disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">Add a connection</p>
      <form onSubmit={add} className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={dir} onChange={(e) => setDir(e.target.value as 'out' | 'in')} className="input-ios text-xs">
            <option value="out">{title.title} references the title below</option>
            <option value="in">The title below references {title.title}</option>
          </select>
          <select value={rel} onChange={(e) => setRel(e.target.value)} className="input-ios text-xs">
            {REL_ORDER.map((r) => (
              <option key={r} value={r}>
                {relLabel('en', r)}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          {target ? (
            <div className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-2 text-xs">
              <span>
                <b>{target.title}</b>
                {target.year && <span className="ml-1 text-white/40">{target.year}</span>}
              </span>
              <button type="button" onClick={() => setTarget(null)} className="text-white/50 hover:text-white">
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                value={tq}
                onChange={(e) => setTq(e.target.value)}
                placeholder="Search the library for the other title"
                className="input-ios w-full text-xs"
              />
              {hits.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-white/10 bg-bg-elevated">
                  {hits.map((h) => (
                    <li key={`${h.mediaType}-${h.tmdbId}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setTarget(h);
                          setHits([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-white/8"
                      >
                        {h.title}
                        {h.year && <span className="ml-1 text-white/40">{h.year}</span>}
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
          rows={2}
          placeholder="Why do they connect? One or two plain sentences (English)."
          className="input-ios w-full text-xs"
          required
          minLength={5}
          maxLength={220}
        />
        <input
          value={reasonId}
          onChange={(e) => setReasonId(e.target.value)}
          placeholder="Indonesian version (optional)"
          className="input-ios w-full text-xs"
          maxLength={220}
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-surflix-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add connection'}
        </button>
      </form>
    </div>
  );
}
