/**
 * Browse Page (/browse)
 * Supports URL params:
 * - ?q=<query>     — search query
 * - ?type=movie|tv — filter media type
 * - ?genre=<id>    — filter by TMDB genre id
 * - ?year=<years>  — filter by years (e.g. "2024,2025")
 */
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

// TMDB genre id → name mapping
const GENRE_NAMES: Record<string, string> = {
  '28': 'Action',
  '12': 'Adventure',
  '16': 'Animation',
  '35': 'Comedy',
  '80': 'Crime',
  '99': 'Documentary',
  '18': 'Drama',
  '10751': 'Family',
  '14': 'Fantasy',
  '36': 'History',
  '27': 'Horror',
  '10402': 'Music',
  '9648': 'Mystery',
  '10749': 'Romance',
  '878': 'Sci-Fi',
  '53': 'Thriller',
  '10752': 'War',
  '37': 'Western',
};

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseLoading />}>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-5 md:py-6">
      <PosterGridSkeleton count={10} />
    </div>
  );
}

function BrowseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params
  const urlQuery = searchParams.get('q') || '';
  const urlType = (searchParams.get('type') as MediaFilter) || 'all';
  const urlGenre = searchParams.get('genre') || '';
  const urlYear = searchParams.get('year') || '';

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [results, setResults] = useState<JellyseerrMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>(urlType);
  const [hideInLibrary, setHideInLibrary] = useState(false);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  // Heading based on filters
  const heading = (() => {
    if (urlQuery) return `Search: "${urlQuery}"`;
    if (urlGenre && GENRE_NAMES[urlGenre]) {
      const genreName = GENRE_NAMES[urlGenre];
      const typeLabel = urlType === 'movie' ? 'Movies' : urlType === 'tv' ? 'Series' : '';
      return `${genreName} ${typeLabel}`.trim();
    }
    if (urlType === 'movie') return 'Movies';
    if (urlType === 'tv') return 'TV Series';
    if (urlYear) return `Released ${urlYear.replace(/,/g, ', ')}`;
    return 'Browse All';
  })();

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Sync state ke URL kalau query berubah (manual typing)
  useEffect(() => {
    if (debouncedQuery !== urlQuery) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedQuery.trim()) {
        params.set('q', debouncedQuery.trim());
      } else {
        params.delete('q');
      }
      router.replace(`/browse?${params.toString()}`, { scroll: false });
    }
  }, [debouncedQuery]);

  // Fetch results based on URL params
  useEffect(() => {
    fetchResults();
  }, [urlQuery, urlType, urlGenre, urlYear]);

  async function fetchResults() {
    setLoading(true);
    try {
      let url = '';
      // Priority: query > discover (genre/type/year)
      if (urlQuery && urlQuery.length >= 2) {
        url = `/api/search?q=${encodeURIComponent(urlQuery)}`;
      } else {
        // Use discover endpoint
        const params = new URLSearchParams();
        if (urlType !== 'all') params.set('type', urlType);
        if (urlGenre) params.set('genre', urlGenre);
        if (urlYear) params.set('year', urlYear);
        url = `/api/discover?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(type: MediaFilter) {
    setMediaFilter(type);
    const params = new URLSearchParams(searchParams.toString());
    if (type === 'all') {
      params.delete('type');
    } else {
      params.set('type', type);
    }
    router.replace(`/browse?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    router.replace('/browse');
    setQuery('');
    setMediaFilter('all');
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

  // Apply client-side hide in library
  const filtered = results.filter((item) => {
    if (mediaFilter !== 'all' && item.mediaType !== mediaFilter) return false;
    if (hideInLibrary && item.mediaInfo?.status === 5) return false;
    return true;
  });

  const hasActiveFilter = urlGenre || urlType !== 'all' || urlYear || urlQuery;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-5 md:py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{heading}</h1>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-surflix-500 hover:text-surflix-600"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Icons.Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari film atau series..."
          className="input-ios w-full pl-10"
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
        <FilterChip active={mediaFilter === 'all'} onClick={() => updateFilter('all')}>
          All
        </FilterChip>
        <FilterChip active={mediaFilter === 'movie'} onClick={() => updateFilter('movie')} icon={<Icons.Film className="h-3 w-3" />}>
          Movies
        </FilterChip>
        <FilterChip active={mediaFilter === 'tv'} onClick={() => updateFilter('tv')} icon={<Icons.Tv className="h-3 w-3" />}>
          Series
        </FilterChip>
        <div className="mx-1 self-center text-white/20">|</div>
        <FilterChip active={hideInLibrary} onClick={() => setHideInLibrary(!hideInLibrary)} icon={<Icons.EyeOff className="h-3 w-3" />}>
          Hide in library
        </FilterChip>
      </div>

      {/* Active filters info */}
      {(urlGenre || urlYear) && (
        <div className="mb-4 flex flex-wrap gap-1.5 text-[11px]">
          {urlGenre && GENRE_NAMES[urlGenre] && (
            <span className="rounded-full bg-surflix-500/15 px-2.5 py-1 text-surflix-500">
              Genre: {GENRE_NAMES[urlGenre]}
            </span>
          )}
          {urlYear && (
            <span className="rounded-full bg-surflix-500/15 px-2.5 py-1 text-surflix-500">
              Year: {urlYear.replace(/,/g, ', ')}
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <PosterGridSkeleton count={10} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="Search"
          title="Gak ada hasil"
          description={urlQuery
            ? `Gak nemu apa-apa buat "${urlQuery}". Coba kata kunci lain.`
            : 'Belum ada film yang match dengan filter ini.'}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-white/40">{filtered.length} hasil ditemukan</p>
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
