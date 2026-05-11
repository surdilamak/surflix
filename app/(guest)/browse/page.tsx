/**
 * Browse Page (/browse)
 * Search + filters (media type, hide in library)
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { PosterCard } from '@/components/ui/poster-card';
import { DetailModal } from '@/components/ui/detail-modal';
import { RequestFormModal } from '@/components/ui/request-form-modal';
import { Toast } from '@/components/ui/toast';
import { PosterGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

type MediaFilter = 'all' | 'movie' | 'tv';

export default function BrowsePage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<JellyseerrMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [hideInLibrary, setHideInLibrary] = useState(false);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Run search saat debouncedQuery berubah
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    runSearch(debouncedQuery);
  }, [debouncedQuery]);

  async function runSearch(q: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
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

  // Apply client-side filters
  const filtered = results.filter((item) => {
    if (mediaFilter !== 'all' && item.mediaType !== mediaFilter) return false;
    if (hideInLibrary && item.mediaInfo?.status === 5) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-5 md:py-6">
      {/* Search bar */}
      <div className="relative mb-3">
        <Icons.Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari film atau series..."
          className="input-ios w-full pl-10"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white"
          >
            <Icons.X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <FilterChip active={mediaFilter === 'all'} onClick={() => setMediaFilter('all')}>
          All
        </FilterChip>
        <FilterChip active={mediaFilter === 'movie'} onClick={() => setMediaFilter('movie')} icon={<Icons.Film className="h-3 w-3" />}>
          Movies
        </FilterChip>
        <FilterChip active={mediaFilter === 'tv'} onClick={() => setMediaFilter('tv')} icon={<Icons.Tv className="h-3 w-3" />}>
          Series
        </FilterChip>
        <div className="mx-1 self-center text-white/20">|</div>
        <FilterChip active={hideInLibrary} onClick={() => setHideInLibrary(!hideInLibrary)} icon={<Icons.EyeOff className="h-3 w-3" />}>
          Hide in library
        </FilterChip>
      </div>

      {/* Results */}
      {loading ? (
        <PosterGridSkeleton count={8} />
      ) : debouncedQuery.length < 2 ? (
        <EmptyState
          icon="Search"
          title="Cari film atau series"
          description="Ketik judul, nama aktor, atau kata kunci untuk mulai cari."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="Search"
          title="Gak ada hasil"
          description={`Gak nemu apa-apa buat "${debouncedQuery}". Coba kata kunci lain.`}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-white/40">
            {filtered.length} hasil ditemukan
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((item) => (
              <PosterCard
                key={`${item.mediaType}-${item.id}`}
                item={item}
                onClick={() => openDetail(item)}
              />
            ))}
          </div>
        </>
      )}

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
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all',
        active
          ? 'border-surflix-500 bg-surflix-500 text-white'
          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
      )}
    >
      {icon}
      {children}
    </button>
  );
}
