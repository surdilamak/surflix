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
import { useLang } from '@/components/connections/lang-provider';

export default function TrendingPage() {
  const { t } = useLang();
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
      if (!append) setError(t('hub.trending.errorBody'));
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
    setToast({ message: t('hub.toast.requestSent'), variant: 'success' });
    setTimeout(() => setToast(null), 4500);
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

  if (loading) {
    return (
      <>
        <div className="rq-wrap pt-6 md:pt-8">
          <HeroSkeleton />
        </div>
        <div className="rq-wrap py-6 md:py-8">
          <PosterGridSkeleton count={10} />
        </div>
      </>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="rq-wrap py-10">
        <EmptyState
          icon="AlertCircle"
          title={t('hub.trending.errorTitle')}
          description={error || t('hub.trending.emptyBody')}
          action={{ label: t('hub.trending.retry'), onClick: () => loadTrending(1, false) }}
        />
      </div>
    );
  }

  const [hero, ...rest] = items;

  return (
    <>
      <div className="rq-wrap pt-6 md:pt-8">
        <Hero
          item={hero}
          rank={1}
          onRequest={() => handleRequestClick(hero)}
          onDetail={() => openDetail(hero)}
        />
      </div>

      <div className="rq-wrap py-6 md:py-8">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <h2 className="rq-h2">{t('hub.sec.trending')}</h2>
          <span className="rq-small text-rq-muted">{t('hub.trending.items', { n: items.length })}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
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
              className="rq-btn rq-rq-btn rq-btn-secondary rq-btn-wide disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('hub.trending.moreLoading')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  {t('hub.trending.more')}
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
