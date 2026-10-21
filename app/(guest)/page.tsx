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
import { RemarkFormModal } from '@/components/ui/remark-form-modal';
import { Toast } from '@/components/ui/toast';
import { PosterGridSkeleton } from '@/components/ui/skeleton';
import { QuickFilterChips } from '@/components/ui/quick-filter-chips';
import { Icons } from '@/components/ui/icons';
import { useLang } from '@/components/connections/lang-provider';

interface MostRequestedItem extends JellyseerrMediaItem {
  requestCount?: number;
}

interface LibraryStats {
  moviesCount: number;
  seriesCount: number;
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useLang();

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
  const [remarkOpen, setRemarkOpen] = useState(false);
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
    setToast({ message: t('hub.toast.requestSent'), variant: 'success' });
    setTimeout(() => setToast(null), 4500);
    setTimeout(loadMostRequested, 1500);
  }

  function handleRemarkClick(item: JellyseerrMediaItem) {
    setSelectedItem(item);
    setDetailOpen(false);
    setRemarkOpen(true);
  }

  function handleRemarkSuccess() {
    setRemarkOpen(false);
    setToast({ message: t('hub.toast.noteSent'), variant: 'success' });
    setTimeout(() => setToast(null), 4500);
  }

  const greeting = guestName ? t('hub.home.hi', { name: guestName.split(' ')[0] }) : t('hub.home.title');
  const subtitle = guestName ? t('hub.home.subHi') : t('hub.home.sub');

  const hasStats = !!stats && (stats.moviesCount > 0 || stats.seriesCount > 0);

  const gridCls = 'grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6';

  return (
    <>
      <div className="rq-wrap py-6 md:py-10">
        {/* Greeting + search + library size */}
        <div className="mb-10 grid gap-6 md:mb-12 md:grid-cols-12 md:gap-2">
          <div className={hasStats ? 'md:col-span-8' : 'md:col-span-12'}>
            <h1 className="rq-title">{greeting}</h1>
            <p className="rq-text mt-3 text-rq-muted">{subtitle}</p>

            <div className="relative mt-6">
              <Icons.Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rq-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder={t('hub.search.placeholder')}
                aria-label={t('hub.search.label')}
                className="input-ios min-h-14! w-full pl-12 pr-32 text-base! placeholder:text-rq-muted"
              />
              <button
                onClick={handleSearchSubmit}
                disabled={query.trim().length < 2}
                className="btn-primary absolute right-1.5 top-1/2 min-h-11! -translate-y-1/2 gap-2"
              >
                {t('hub.search.go')}
                <Icons.ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {hasStats && stats && (
            <div className="grid grid-cols-2 gap-2 md:col-span-4">
              <div className="rq-tile flex items-center gap-3 p-3 md:flex-col md:items-start md:justify-between md:p-4">
                <Icons.Film className="h-5 w-5 text-rq-accent" />
                <div className="md:mt-4">
                  <p className="text-2xl font-semibold leading-none tracking-tight md:text-4xl">{stats.moviesCount.toLocaleString()}</p>
                  <p className="rq-small text-rq-muted">{t(stats.moviesCount === 1 ? 'hub.stat.movie' : 'hub.stat.movies')}</p>
                </div>
              </div>
              <div className="rq-tile flex items-center gap-3 p-3 md:flex-col md:items-start md:justify-between md:p-4">
                <Icons.Tv className="h-5 w-5 text-rq-accent" />
                <div className="md:mt-4">
                  <p className="text-2xl font-semibold leading-none tracking-tight md:text-4xl">{stats.seriesCount.toLocaleString()}</p>
                  <p className="rq-small text-rq-muted">{t('hub.stat.series')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick filter categories */}
        <section className="mb-10 md:mb-12" aria-labelledby="rq-cats">
          <h2 id="rq-cats" className="rq-h2 mb-3">{t('hub.cat.title')}</h2>
          <QuickFilterChips />
        </section>

        {/* Most Requested by Friends */}
        {mostRequested.length > 0 && (
          <section className="mb-10 md:mb-12">
            <h2 className="rq-h2 mb-3">{t('hub.sec.mostRequested')}</h2>
            <div className={gridCls}>
              {mostRequested.slice(0, 6).map((item) => (
                <PosterCard key={`${item.mediaType}-${item.id}`} item={item} onClick={() => openDetail(item)} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        <section className="mb-10 md:mb-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="rq-h2">{t('hub.sec.trending')}</h2>
            <a href="/trending" className="rq-small inline-flex min-h-11 items-center gap-1 text-rq-muted hover:text-white">
              {t('hub.sec.seeAll')} <Icons.ArrowRight className="h-4 w-4" />
            </a>
          </div>
          {loadingTrending ? (
            <PosterGridSkeleton count={6} />
          ) : (
            <div className={gridCls}>
              {trending.map((item) => (
                <PosterCard key={`${item.mediaType}-${item.id}`} item={item} onClick={() => openDetail(item)} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Section */}
        {(loadingUpcoming || upcoming.length > 0) && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="rq-h2">{t('hub.sec.coming')}</h2>
              <span className="rq-small text-rq-muted">{t('hub.sec.notReleased')}</span>
            </div>
            {loadingUpcoming ? (
              <PosterGridSkeleton count={6} />
            ) : (
              <div className={gridCls}>
                {upcoming.map((item) => (
                  <PosterCard key={`${item.mediaType}-${item.id}`} item={item} onClick={() => openDetail(item)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <DetailModal
        item={selectedItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRequest={handleRequestClick}
        onRequestImprovement={handleRemarkClick}
      />
      <RequestFormModal item={selectedItem} open={requestOpen} onClose={() => setRequestOpen(false)} onSuccess={handleRequestSuccess} />
      <RemarkFormModal item={selectedItem} open={remarkOpen} onClose={() => setRemarkOpen(false)} onSuccess={handleRemarkSuccess} />
      <Toast message={toast?.message || ''} variant={toast?.variant} open={!!toast} onClose={() => setToast(null)} />
    </>
  );
}
