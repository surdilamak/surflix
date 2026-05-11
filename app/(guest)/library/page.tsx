/**
 * Library Page (/library)
 *
 * Mode:
 * 1. Personal: kalau guest punya request yang status=AVAILABLE,
 *    tampilkan film-film tersebut (auto-detect via localStorage email)
 * 2. Community: tampilkan film yang guest LAIN request & udah available
 * 3. Empty: belum ada email guest sama sekali — minta input
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PosterCard } from '@/components/ui/poster-card';
import { DetailModal } from '@/components/ui/detail-modal';
import { PosterGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Icons } from '@/components/ui/icons';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';

interface LibraryItem {
  id: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  rating?: number | null;
  availableAt?: string | null;
}

type Mode = 'loading' | 'personal' | 'community' | 'empty';

export default function LibraryPage() {
  const [mode, setMode] = useState<Mode>('loading');
  const [personalItems, setPersonalItems] = useState<LibraryItem[]>([]);
  const [communityItems, setCommunityItems] = useState<LibraryItem[]>([]);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setMode('loading');

    // Get email dari localStorage
    let email: string | null = null;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('surflix_guest_info');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.email) email = parsed.email;
        } catch {}
      }
    }
    setGuestEmail(email);

    try {
      const res = await fetch(`/api/library${email ? `?email=${encodeURIComponent(email)}` : ''}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      const personal: LibraryItem[] = data.personal || [];
      const community: LibraryItem[] = data.community || [];

      setPersonalItems(personal);
      setCommunityItems(community);

      // Decide mode
      if (personal.length > 0) {
        setMode('personal');
      } else if (community.length > 0) {
        setMode('community');
      } else {
        setMode('empty');
      }
    } catch {
      setMode('empty');
    }
  }

  // Convert LibraryItem ke JellyseerrMediaItem buat modal compatibility
  function toMediaItem(item: LibraryItem): JellyseerrMediaItem {
    return {
      id: item.tmdbId,
      mediaType: item.mediaType,
      title: item.mediaType === 'movie' ? item.title : undefined,
      name: item.mediaType === 'tv' ? item.title : undefined,
      overview: item.overview || undefined,
      posterPath: item.posterPath || undefined,
      backdropPath: item.backdropPath || undefined,
      releaseDate: item.mediaType === 'movie' ? item.releaseDate || undefined : undefined,
      firstAirDate: item.mediaType === 'tv' ? item.releaseDate || undefined : undefined,
      voteAverage: item.rating || undefined,
      mediaInfo: { id: 0, tmdbId: item.tmdbId, status: 5 }, // 5 = Available
    };
  }

  function openDetail(item: LibraryItem) {
    setSelectedItem(toMediaItem(item));
    setDetailOpen(true);
  }

  // === RENDER ===

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-5 md:py-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            <span className="inline-flex items-center gap-2">
              <Icons.Library className="h-5 w-5 md:h-6 md:w-6" />
              Library
            </span>
          </h1>
          <p className="mt-1 text-xs text-white/50">
            {mode === 'personal' && `${personalItems.length} film/series yang lo request udah ready`}
            {mode === 'community' && 'Film yang udah ada di library Surflix'}
            {mode === 'empty' && 'Belum ada apa-apa di sini'}
            {mode === 'loading' && 'Loading...'}
          </p>
        </div>
        {process.env.NEXT_PUBLIC_JELLYFIN_URL && (
          <a
            href={process.env.NEXT_PUBLIC_JELLYFIN_URL}
            target="_blank"
            rel="noopener"
            className="btn-secondary text-xs"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icons.ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">Open</span> Jellyfin
            </span>
          </a>
        )}
      </div>

      {/* Loading */}
      {mode === 'loading' && <PosterGridSkeleton count={10} />}

      {/* Personal Library */}
      {mode === 'personal' && (
        <>
          <div className="mb-4 rounded-ios-lg border border-ios-green/20 bg-ios-green/5 p-3">
            <p className="text-xs text-white/80">
              <Icons.CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-ios-green" />
              Ini film yang lo request via Surflix & udah ready di Jellyfin
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {personalItems.map((item) => (
              <PosterCard
                key={item.id}
                item={toMediaItem(item)}
                onClick={() => openDetail(item)}
              />
            ))}
          </div>

          {/* Community section di bawah personal */}
          {communityItems.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-base font-semibold tracking-tight md:text-lg">
                <span className="inline-flex items-center gap-1.5">
                  <Icons.Sparkles className="h-4 w-4 text-ios-orange" />
                  Also Available in Library
                </span>
              </h2>
              <p className="mb-3 text-xs text-white/40">
                Film yang ke-request guest lain & udah ada di Jellyfin
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                {communityItems.slice(0, 10).map((item) => (
                  <PosterCard
                    key={item.id}
                    item={toMediaItem(item)}
                    onClick={() => openDetail(item)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Community Library Only */}
      {mode === 'community' && (
        <>
          {!guestEmail && (
            <div className="mb-4 rounded-ios-lg border border-ios-blue/30 bg-ios-blue/10 p-3">
              <p className="text-xs text-white/80">
                <Icons.Info className="mr-1.5 inline h-3.5 w-3.5 text-ios-blue" />
                Belum ada request lo sendiri.{' '}
                <Link href="/" className="font-medium text-ios-blue hover:underline">
                  Request film pertama lo →
                </Link>
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {communityItems.map((item) => (
              <PosterCard
                key={item.id}
                item={toMediaItem(item)}
                onClick={() => openDetail(item)}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {mode === 'empty' && (
        <EmptyState
          icon="Library"
          title="Library masih kosong"
          description="Belum ada film yang ke-request di Surflix. Yuk mulai request film pertama!"
          action={{
            label: 'Request film sekarang',
            onClick: () => (window.location.href = '/'),
          }}
        />
      )}

      <DetailModal
        item={selectedItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRequest={() => {}}
      />
    </div>
  );
}
