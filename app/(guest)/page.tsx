/**
 * Home Page (/) — Request-first with library stats + upcoming section
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { PosterCard } from '@/components/ui/poster-card';
import { DetailModal } from '@/components/ui/detail-modal';
import { RequestFormModal } from '@/components/ui/request-form-modal';
import { Toast } from '@/components/ui/toast';
import { PosterGridSkeleton } from '@/components/ui/skeleton';
import { QuickFilterChips } from '@/components/ui/quick-filter-chips';
import { Icons } from '@/components/ui/icons';

interface MostRequestedItem extends JellyseerrMediaItem {
  requestCount?: number;
}

interface LibraryStats {
  moviesCount: number;
  seriesCount: number;
}

export default function HomePage() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [guestName, setGuestName] = useState<string | null>(null);

  const [trending, setTrending] = useState<JellyseerrMediaItem[]>([]);
  const [mostRequested, setMostRequested] = useState<MostRequestedItem[]>([]);
  const [upcoming, setUpcoming] = useState<JellyseerrMediaItem[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('surflix_guest_info');
      if (saved) {
        try {
          const { name } = JSON.parse(saved);
          if (name) setGuestName(name);
        } catch {}
      }
    }
    loadTrending();
    loadMostRequested();
    loadStats();
    loadUpcoming();
  }, []);

  async function loadTrending() {
    setLoadingTrending(true);
    try {
      const res = await fetch('/api/trending?page=1');
      if (res.ok) {
        const data = await res.json();
        setTrending(data.results.slice(0, 6));
      }
    } catch {
      setTrending([]);
    } finally {
      setLoadingTrending(false);
    }
  }

  async function loadMostRequested() {
    try {
      const res = await fetch('/api/most-requested');
      if (res.ok) {
        const data = await res.json();
        setMostRequested(data.results || []);
      }
    } catch {}
  }

  async function loadUpcoming() {
    setLoadingUpcoming(true);
    try {
      const res = await fetch('/api/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcoming((data.results || []).slice(0, 6));
      }
    } catch {
      setUpcoming([]);
    } finally {
      setLoadingUpcoming(false);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/library-stats');
      if (res.ok) {
        const data = await res.json();
        setStats({ moviesCount: data.moviesCount, seriesCount: data.seriesCount });
      }
    } catch {}
  }

  function handleSearchSubmit() {
    if (query.trim().length >= 2) {
      router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function openDetail(item: JellyseerrMediaItem) {
    setSelectedItem(item);
    setDetailOpen(true);
  }

  function handleRequestClick(item: JellyseerrMediaItem) {
    setSelectedItem(item);
    setDetailOpen(false);
    setRequestOpen(true);
  }

  function handleRequestSuccess() {
    setRequestOpen(false);
    setToast({ message: 'Request lo udah masuk! Admin akan review dalam 1-3 hari.', variant: 'success' });
    setTimeout(() => setToast(null), 4500);
    setTimeout(loadMostRequested, 1500);
  }

  const greeting = guestName ? `Hi ${guestName.split(' ')[0]} 👋` : 'Mau request film apa?';
  const subtitle = guestName
    ? 'Search film atau series favorit lo, atau browse kategori di bawah'
    : 'Search atau pilih dari kategori — easy & fast';

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-5 md:py-10">
        {/* Hero greeting + search */}
        <div className="mb-6 md:mb-10">
          <h1 className="text-2xl font-semibold tracking-tighter md:text-3xl">{greeting}</h1>
          <p className="mt-1.5 text-sm text-white/55 md:text-base">{subtitle}</p>

          <div className="mt-5 md:mt-6">
            <div className="relative">
              <Icons.Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder="Cari film atau series..."
                className="w-full rounded-ios-lg border border-white/[0.1] bg-white/[0.05] py-3.5 pl-12 pr-28 text-base text-white placeholder-white/40 outline-none transition-all focus:border-white/25 focus:bg-white/[0.08] md:py-4 md:text-lg"
              />
              {query.trim().length >= 2 && (
                <button
                  onClick={handleSearchSubmit}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surflix-500 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-surflix-600"
                >
                  <span className="inline-flex items-center gap-1">Search<Icons.ArrowRight className="h-3.5 w-3.5" /></span>
                </button>
              )}
            </div>
          </div>

          {/* Library Stats */}
          {stats && (stats.moviesCount > 0 || stats.seriesCount > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
                <Icons.Film className="h-3 w-3" />
                {stats.moviesCount.toLocaleString()} {stats.moviesCount === 1 ? 'movie' : 'movies'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
                <Icons.Tv className="h-3 w-3" />
                {stats.seriesCount.toLocaleString()} {stats.seriesCount === 1 ? 'series' : 'series'}
              </span>
              <span className="text-white/30">— available di Surflix</span>
            </div>
          )}
        </div>

        {/* Quick filter categories */}
        <section className="mb-8 md:mb-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 md:text-xs">
            Browse by category
          </h2>
          <QuickFilterChips />
        </section>

        {/* Most Requested by Friends */}
        {mostRequested.length > 0 && (
          <section className="mb-8 md:mb-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Sparkles className="h-4 w-4 text-ios-orange" />
                  Most Requested by Friends
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              {mostRequested.slice(0, 6).map((item) => (
                <PosterCard key={`${item.mediaType}-${item.id}`} item={item} onClick={() => openDetail(item)} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        <section className="mb-8 md:mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              <span className="inline-flex items-center gap-1.5">
                <Icons.Flame className="h-4 w-4 text-ios-orange" />
                Trending This Week
              </span>
            </h2>
            <a href="/trending" className="text-xs font-medium text-surflix-500 hover:text-surflix-600 md:text-sm">
              See all <Icons.ChevronRight className="inline h-3 w-3" />
            </a>
          </div>
          {loadingTrending ? (
            <PosterGridSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              {trending.map((item) => (
                <PosterCard key={`${item.mediaType}-${item.id}`} item={item} onClick={() => openDetail(item)} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Section */}
        {(loadingUpcoming || upcoming.length > 0) && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Calendar className="h-4 w-4 text-ios-orange" />
                  Coming Soon
                </span>
              </h2>
              <span className="text-xs text-white/40">Belum rilis</span>
            </div>
            {loadingUpcoming ? (
              <PosterGridSkeleton count={6} />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {upcoming.map((item) => (
                  <PosterCard key={`${item.mediaType}-${item.id}`} item={item} onClick={() => openDetail(item)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <DetailModal item={selectedItem} open={detailOpen} onClose={() => setDetailOpen(false)} onRequest={handleRequestClick} />
      <RequestFormModal item={selectedItem} open={requestOpen} onClose={() => setRequestOpen(false)} onSuccess={handleRequestSuccess} />
      <Toast message={toast?.message || ''} variant={toast?.variant} open={!!toast} onClose={() => setToast(null)} />
    </>
  );
}
