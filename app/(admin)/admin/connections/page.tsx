/**
 * Admin Film Connections (/admin/connections)
 *
 * Review queue buat draft referensi film dari LLM + trigger generate per film.
 * LLM cuma jalan dari sini (admin-triggered), guest gak pernah.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/empty-state';

interface Connection {
  id: string;
  sourceTmdbId: number;
  sourceMediaType: string;
  sourceTitle: string;
  targetTitle: string;
  targetYear?: number | null;
  targetPoster?: string | null;
  relationship: string;
  reason: string;
  status: string;
}

interface SearchResult {
  id: number;
  mediaType: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  releaseDate?: string;
  firstAirDate?: string;
}

const REL_STYLE: Record<string, { label: string; cls: string }> = {
  homage: { label: 'homage', cls: 'bg-[#7F77DD]/20 text-[#9d97e8]' },
  inspired: { label: 'inspired by', cls: 'bg-ios-green/20 text-ios-green' },
  visual: { label: 'visual ref', cls: 'bg-ios-orange/20 text-ios-orange' },
};

export default function AdminConnectionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Generate form
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadItems() {
    try {
      const res = await fetch('/api/admin/connections?status=PENDING_REVIEW');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setItems(data.connections || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActioningId(id);
    try {
      const res = await fetch('/api/admin/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal update', 'error');
        return;
      }
      showToast(action === 'approve' ? 'Referensi di-approve' : 'Referensi di-reject', 'success');
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActioningId(null);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults((data.results || []).filter((r: SearchResult) => r.mediaType !== 'person').slice(0, 6));
    } catch {
      showToast('Gagal search', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleGenerate(r: SearchResult) {
    if (r.mediaType === 'person') return;
    setGeneratingId(r.id);
    try {
      const res = await fetch('/api/admin/connections/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId: r.id, mediaType: r.mediaType }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal generate', 'error');
        return;
      }
      const s = data.summary;
      showToast(`${s.created} baru, ${s.existing} udah ada, ${s.skipped.length} di-skip`, 'success');
      loadItems();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/login');
  }

  // Group per film sumber
  const groups = items.reduce<Record<string, Connection[]>>((acc, c) => {
    const key = `${c.sourceMediaType}:${c.sourceTmdbId}`;
    (acc[key] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/70 backdrop-blur-ios">
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
                Referensi
                {items.length > 0 && (
                  <span className="ml-1 rounded-full bg-surflix-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {items.length}
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

      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tighter md:text-3xl">Referensi Film</h1>

        {/* Generate */}
        <div className="mb-8 rounded-ios-lg border border-white/[0.08] bg-bg-surface p-4">
          <p className="mb-1 text-sm font-semibold tracking-tight">Generate draft referensi</p>
          <p className="mb-3 text-[11px] text-white/50">
            Cari film yang udah ada di library. LLM dipanggil sekali per klik, hasilnya masuk antrian review.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Judul film / serial"
              className="input-ios w-full text-xs"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {searching ? 'Mencari...' : 'Cari'}
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {results.map((r) => {
                const title = r.title || r.name || 'Untitled';
                const year = (r.releaseDate || r.firstAirDate || '').split('-')[0];
                return (
                  <div key={`${r.mediaType}-${r.id}`} className="flex items-center justify-between gap-3 rounded-ios-lg bg-white/[0.04] px-3 py-2">
                    <p className="min-w-0 truncate text-xs">
                      {title} <span className="text-white/40">{year} · {r.mediaType === 'tv' ? 'Series' : 'Movie'}</span>
                    </p>
                    <button
                      onClick={() => handleGenerate(r)}
                      disabled={generatingId !== null}
                      className="flex-shrink-0 rounded-full bg-surflix-500 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {generatingId === r.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Icons.Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        'Generate'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Review queue */}
        <h2 className="mb-3 text-lg font-semibold tracking-tighter">Antrian review</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-ios-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="CheckCircle2"
            title="Antrian kosong"
            description="Generate draft baru dari form di atas."
            action={{ label: 'Lihat dashboard', onClick: () => router.push('/admin') }}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([key, list]) => (
              <div key={key}>
                <p className="mb-2 text-xs text-white/50">
                  Referensi dari <span className="font-medium text-white/80">{list[0].sourceTitle}</span>
                </p>
                <div className="space-y-3">
                  {list.map((c) => (
                    <ConnectionCard
                      key={c.id}
                      c={c}
                      actioning={actioningId === c.id}
                      onAction={(a) => handleAction(c.id, a)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed left-1/2 top-4 z-[200] -translate-x-1/2"
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

function ConnectionCard({
  c,
  actioning,
  onAction,
}: {
  c: Connection;
  actioning: boolean;
  onAction: (action: 'approve' | 'reject') => void;
}) {
  const rel = REL_STYLE[c.relationship];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-ios-lg border border-white/[0.08] bg-bg-surface p-4"
    >
      <div className="flex gap-3 md:gap-4">
        <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-bg-elevated">
          {c.targetPoster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w185${c.targetPoster}`}
              alt={c.targetTitle}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icons.Film className="h-6 w-6 text-white/20" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight md:text-base">{c.targetTitle}</p>
              {c.targetYear && <p className="text-[11px] text-white/50">{c.targetYear}</p>}
            </div>
            {rel && (
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${rel.cls}`}>
                {rel.label}
              </span>
            )}
          </div>

          <p className="mb-3 text-[12px] leading-relaxed text-white/70">{c.reason}</p>

          <div className="flex gap-2">
            <button
              onClick={() => onAction('approve')}
              disabled={actioning}
              className="flex-1 rounded-full bg-ios-green px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icons.Check className="h-3 w-3" />
                Approve
              </span>
            </button>
            <button
              onClick={() => onAction('reject')}
              disabled={actioning}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-ios-red/20 hover:text-ios-red disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icons.X className="h-3 w-3" />
                Reject
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
