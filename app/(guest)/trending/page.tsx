/**
 * Trending Page (/trending) — with Load More pagination
 */
'use client';

import { useEffect, useState } from 'react';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { PosterCard } from '@/components/ui/poster-card';
import { Hero } from '@/components/ui/hero';
import { DetailModal } from '@/components/ui/detail-modal';
import { RequestFormModal } from '@/components/ui/request-form-modal';
import { RemarkFormModal } from '@/components/ui/remark-form-modal';
import { Toast } from '@/components/ui/toast';
import { HeroSkeleton, PosterGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Icons } from '@/components/ui/icons';

export default function TrendingPage() {
  const [items, setItems] = useState<JellyseerrMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTrending(1, false);
  }, []);

  async function loadTrending(pageNum: number, append: boolean) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trending?page=${pageNum}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (append) {
        setItems((prev) => [...prev, ...data.results]);
      } else {
        setItems(data.results);
      }
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch {
      if (!append) setError('Gagal load trending. Coba refresh halaman.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    loadTrending(page + 1, true);
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
  }

  function handleRemarkClick(item: JellyseerrMediaItem) {
    setSelectedItem(item);
    setDetailOpen(false);
    setRemarkOpen(true);
  }

  function handleRemarkSuccess() {
    setRemarkOpen(false);
    setToast({ message: 'Catatan lo udah masuk. Makasih ya!', variant: 'success' });
    setTimeout(() => setToast(null), 4500);
  }

  if (loading) {
    return (
      <>
        <HeroSkeleton />
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-5 md:py-6">
          <PosterGridSkeleton count={10} />
        </div>
      </>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          icon="AlertCircle"
          title="Gak bisa load trending"
          description={error || 'Belum ada data trending'}
          action={{ label: 'Coba lagi', onClick: () => loadTrending(1, false) }}
        />
      </div>
    );
  }

  const [hero, ...rest] = items;

  return (
    <>
      <Hero
        item={hero}
        rank={1}
        onRequest={() => handleRequestClick(hero)}
        onDetail={() => openDetail(hero)}
      />

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-5 md:py-6">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            <span className="inline-flex items-center gap-1.5">
              <Icons.Flame className="h-4 w-4 text-ios-orange md:h-5 md:w-5" />
              Trending This Week
            </span>
          </h2>
          <span className="text-xs text-white/40">{items.length} items</span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {rest.map((item) => (
            <PosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onClick={() => openDetail(item)}
            />
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="btn-secondary px-6 disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading more...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  Load more trending
                  <Icons.ChevronDown className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <DetailModal
        item={selectedItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRequest={handleRequestClick}
        onRequestImprovement={handleRemarkClick}
      />

      <RequestFormModal
        item={selectedItem}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSuccess={handleRequestSuccess}
      />

      <RemarkFormModal
        item={selectedItem}
        open={remarkOpen}
        onClose={() => setRemarkOpen(false)}
        onSuccess={handleRemarkSuccess}
      />

      <Toast
        message={toast?.message || ''}
        variant={toast?.variant}
        open={!!toast}
        onClose={() => setToast(null)}
      />
    </>
  );
}
