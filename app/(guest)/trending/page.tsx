/**
 * Trending Page (/trending)
 * Hero #1 + grid trending mingguan (TMDB)
 * Pindahan dari old home page.
 */
'use client';

import { useEffect, useState } from 'react';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { PosterCard } from '@/components/ui/poster-card';
import { Hero } from '@/components/ui/hero';
import { DetailModal } from '@/components/ui/detail-modal';
import { RequestFormModal } from '@/components/ui/request-form-modal';
import { Toast } from '@/components/ui/toast';
import { HeroSkeleton, PosterGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Icons } from '@/components/ui/icons';

export default function TrendingPage() {
  const [items, setItems] = useState<JellyseerrMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTrending();
  }, []);

  async function loadTrending() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trending');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.results);
    } catch {
      setError('Gagal load trending. Coba refresh halaman.');
    } finally {
      setLoading(false);
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
          action={{ label: 'Coba lagi', onClick: loadTrending }}
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
      </div>

      <DetailModal
        item={selectedItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRequest={handleRequestClick}
      />

      <RequestFormModal
        item={selectedItem}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSuccess={handleRequestSuccess}
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
