/**
 * Browse Page (/browse) — Advanced
 *
 * URL params:
 * - q=<query>
 * - type=movie|tv
 * - genre=<id>
 * - year=<year>
 * - network=<id>  (Netflix=213, HBO=49, Apple TV+=2552, Disney+=2739, Prime=1024, Hulu=453)
 *
 * Features:
 * - Search with autocomplete suggestions
 * - Network filter chips
 * - Load more (pagination)
 */
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { PosterCard } from '@/components/ui/poster-card';
import { DetailModal } from '@/components/ui/detail-modal';
import { RequestFormModal } from '@/components/ui/request-form-modal';
import { RemarkFormModal } from '@/components/ui/remark-form-modal';
import { Toast } from '@/components/ui/toast';
import { PosterGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/connections/lang-provider';
import { GENRES_EN, GENRES_ID } from '@/lib/i18n-hub';

type MediaFilter = 'all' | 'movie' | 'tv';

const NETWORKS: Array<{ id: string; label: string; tvOnly?: boolean }> = [
  { id: '213', label: 'Netflix' },
  { id: '2552', label: 'Apple TV+', tvOnly: true },
  { id: '49', label: 'HBO Max', tvOnly: true },
  { id: '2739', label: 'Disney+' },
  { id: '1024', label: 'Prime Video' },
  { id: '453', label: 'Hulu', tvOnly: true },
];

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseLoading />}>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseLoading() {
  return (
    <div className="rq-wrap py-6 md:py-8">
      <PosterGridSkeleton count={10} />
    </div>
  );
}

function BrowseInner() {
  const router = useRouter();
  const { t, lang } = useLang();
  const GENRE_NAMES = lang === 'id' ? GENRES_ID : GENRES_EN;
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const urlType = (searchParams.get('type') as MediaFilter) || 'all';
  const urlGenre = searchParams.get('genre') || '';
  const urlYear = searchParams.get('year') || '';
  const urlNetwork = searchParams.get('network') || '';

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [results, setResults] = useState<JellyseerrMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>(urlType);
  const [hideInLibrary, setHideInLibrary] = useState(false);

  // Search suggestions
  const [suggestions, setSuggestions] = useState<JellyseerrMediaItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const heading = (() => {
    if (urlQuery) return t('hub.browse.search', { q: urlQuery });
    if (urlNetwork) {
      const net = NETWORKS.find((n) => n.id === urlNetwork);
      return net ? net.label : t('hub.browse.browse');
    }
    if (urlGenre && GENRE_NAMES[urlGenre]) {
      const genreName = GENRE_NAMES[urlGenre];
      const typeLabel = urlType === 'movie' ? t('hub.cat.movies') : urlType === 'tv' ? t('hub.cat.series') : '';
      return `${genreName} ${typeLabel}`.trim();
    }
    if (urlType === 'movie') return t('hub.browse.movies');
    if (urlType === 'tv') return t('hub.browse.tv');
    if (urlYear) return t('hub.browse.released', { y: urlYear.replace(/,/g, ', ') });
    return t('hub.browse.all');
  })();

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Sync query → URL
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

  // Fetch results
  useEffect(() => {
    setPage(1);
    fetchResults(1, false);
  }, [urlQuery, urlType, urlGenre, urlYear, urlNetwork]);

  // Live suggestions (separate from main fetch)
  useEffect(() => {
    if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestionsTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions((data.results || []).slice(0, 5));
          setShowSuggestions(true);
        }
      } catch {}
    }, 250);
    return () => {
      if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    };
  }, [query]);

  async function fetchResults(pageNum: number, append: boolean) {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      let url = '';
      if (urlQuery && urlQuery.length >= 2) {
        url = `/api/search?q=${encodeURIComponent(urlQuery)}&page=${pageNum}`;
      } else {
        const params = new URLSearchParams();
        if (urlType !== 'all') params.set('type', urlType);
        if (urlGenre) params.set('genre', urlGenre);
        if (urlYear) params.set('year', urlYear);
        if (urlNetwork) params.set('network', urlNetwork);
        params.set('page', pageNum.toString());
        url = `/api/discover?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const newResults = data.results || [];

      if (append) {
        setResults((prev) => [...prev, ...newResults]);
      } else {
        setResults(newResults);
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      if (!append) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    fetchResults(page + 1, true);
  }

  function updateFilter(type: MediaFilter) {
    setMediaFilter(type);
    const params = new URLSearchParams(searchParams.toString());
    if (type === 'all') params.delete('type');
    else params.set('type', type);
    router.replace(`/browse?${params.toString()}`, { scroll: false });
  }

  function updateNetwork(networkId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (networkId) {
      params.set('network', networkId);
      params.delete('q'); // network filter mutually exclusive with search
    } else {
      params.delete('network');
    }
    router.replace(`/browse?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    router.replace('/browse');
    setQuery('');
    setMediaFilter('all');
  }

  function selectSuggestion(item: JellyseerrMediaItem) {
    setShowSuggestions(false);
    setSelectedItem(item);
    setDetailOpen(true);
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

  const filtered = results.filter((item) => {
    if (mediaFilter !== 'all' && item.mediaType !== mediaFilter) return false;
    if (hideInLibrary && item.mediaInfo?.status === 5) return false;
    return true;
  });

  const hasActiveFilter = urlGenre || urlType !== 'all' || urlYear || urlQuery || urlNetwork;

  return (
    <div className="rq-wrap py-6 md:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="rq-h1">{heading}</h1>
        {hasActiveFilter && (
          <button onClick={clearFilters} className="rq-small inline-flex min-h-11 items-center px-2 font-medium text-rq-accent hover:text-white">
            {t('hub.browse.clear')}
          </button>
        )}
      </div>

      {/* Search bar with suggestions */}
      <div className="relative mb-3">
        <Icons.Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rq-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={t('hub.search.placeholder')}
          aria-label={t('hub.search.label')}
          className="input-ios w-full pl-10"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setShowSuggestions(false); }}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-rq bg-rq-raised text-rq-muted hover:text-white"
          >
            <Icons.X className="h-3 w-3" />
          </button>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-rq bg-rq-raised ">
            {suggestions.map((s) => (
              <button
                key={`${s.mediaType}-${s.id}`}
                onClick={() => selectSuggestion(s)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#2e2e33]"
              >
                <div className="h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-rq-surface">
                  {s.posterPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w92${s.posterPath}`}
                      alt={s.title || s.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/20">
                      <Icons.Film className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="rq-small truncate font-medium">{s.title || s.name}</p>
                  <p className="text-xs text-rq-muted">
                    {(s.releaseDate || s.firstAirDate || '').split('-')[0]} ·{' '}
                    {s.mediaType === 'movie' ? t('hub.type.movie') : t('hub.poster.series')}
                  </p>
                </div>
                {s.mediaInfo?.status === 5 && (
                  <span className="badge-available">
                    {t('hub.poster.inSurflix')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type filter chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip active={mediaFilter === 'all'} onClick={() => updateFilter('all')}>
          {t('hub.browse.fAll')}
        </FilterChip>
        <FilterChip active={mediaFilter === 'movie'} onClick={() => updateFilter('movie')} icon={<Icons.Film className="h-4 w-4" />}>
          {t('hub.cat.movies')}
        </FilterChip>
        <FilterChip active={mediaFilter === 'tv'} onClick={() => updateFilter('tv')} icon={<Icons.Tv className="h-4 w-4" />}>
          {t('hub.cat.series')}
        </FilterChip>
        <FilterChip active={hideInLibrary} onClick={() => setHideInLibrary(!hideInLibrary)} icon={<Icons.EyeOff className="h-4 w-4" />}>
          {t('hub.browse.hide')}
        </FilterChip>
      </div>

      {/* Network filter chips */}
      <div className="mb-5">
        <p className="rq-small mb-2 text-rq-muted">{t('hub.browse.network')}</p>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={!urlNetwork} onClick={() => updateNetwork(null)}>
            {t('hub.browse.allNetworks')}
          </FilterChip>
          {NETWORKS.filter((n) => !n.tvOnly || urlType === 'tv' || urlType === 'all').map((n) => (
            <FilterChip key={n.id} active={urlNetwork === n.id} onClick={() => updateNetwork(n.id)}>
              {n.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Active filter tags */}
      {(urlGenre || urlYear) && (
        <div className="rq-small mb-4 flex flex-wrap gap-2">
          {urlGenre && GENRE_NAMES[urlGenre] && (
            <span className="rounded-rq bg-rq-surface px-3 py-1.5 text-white">
              {t('hub.browse.genre', { g: GENRE_NAMES[urlGenre] })}
            </span>
          )}
          {urlYear && (
            <span className="rounded-rq bg-rq-surface px-3 py-1.5 text-white">
              {t('hub.browse.year', { y: urlYear.replace(/,/g, ', ') })}
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
          title={t('hub.browse.noneTitle')}
          description={urlQuery ? t('hub.browse.noneQuery', { q: urlQuery }) : t('hub.browse.noneFilter')}
        />
      ) : (
        <>
          <p className="rq-small mb-3 text-rq-muted">{t('hub.browse.results', { n: filtered.length })}</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map((item) => (
              <PosterCard
                key={`${item.mediaType}-${item.id}`}
                item={item}
                onClick={() => openDetail(item)}
              />
            ))}
          </div>

          {/* Load more button */}
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
                    {t('hub.browse.loading')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    {t('hub.browse.more')}
                    <Icons.ChevronDown className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            </div>
          )}
        </>
      )}

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
    </div>
  );
}

function FilterChip({
  active, onClick, icon, children,
}: {
  active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-rq px-3.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-rq-accent text-rq-bg'
          : 'bg-rq-surface text-rq-muted hover:bg-rq-raised hover:text-white'
      )}
    >
      {icon}
      {children}
    </button>
  );
}
