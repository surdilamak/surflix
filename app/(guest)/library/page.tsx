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
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { PosterCard } from '@/components/ui/poster-card';
import { DetailModal } from '@/components/ui/detail-modal';
import { RemarkFormModal } from '@/components/ui/remark-form-modal';
import { Toast } from '@/components/ui/toast';
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
  const config = useAppConfig();
  const [mode, setMode] = useState<Mode>('loading');
  const [personalItems, setPersonalItems] = useState<LibraryItem[]>([]);
  const [communityItems, setCommunityItems] = useState<LibraryItem[]>([]);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

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
    <div className="rq-wrap py-6 md:py-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="rq-h1">Library</h1>
          <p className="rq-small mt-1 text-rq-muted">
            {mode === 'personal' && `${personalItems.length} film/series yang lo request udah ready`}
            {mode === 'community' && 'Film yang udah ada di library Surflix'}
            {mode === 'empty' && 'Belum ada apa-apa di sini'}
            {mode === 'loading' && 'Loading...'}
          </p>
        </div>
        {config?.jellyfinUrl && (
          <a
            href={config.jellyfinUrl}
            target="_blank"
            rel="noopener"
            className="btn-secondary"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icons.ArrowUpRight className="h-4 w-4" />
              <span className="hidden sm:inline">Open</span> Surflix
            </span>
          </a>
        )}
      </div>

      {/* Loading */}
      {mode === 'loading' && <PosterGridSkeleton count={10} />}

      {/* Personal Library */}
      {mode === 'personal' && (
        <>
          <div className="mb-4 rounded-rq bg-rq-surface p-3">
            <p className="rq-small text-white">
              <Icons.CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-rq-accent" />
              Ini film yang lo request via Surflix & udah ready
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
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
              <h2 className="rq-h2 mb-1">Also available in the library</h2>
              <p className="rq-small mb-3 text-rq-muted">
                Film yang ke-request guest lain & udah ada di Surflix
              </p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
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
            <div className="mb-4 rounded-rq bg-rq-surface p-3">
              <p className="rq-small text-white">
                <Icons.Info className="mr-1.5 inline h-3.5 w-3.5 text-rq-accent" />
                Belum ada request lo sendiri.{' '}
                <Link href="/" className="font-medium text-rq-accent hover:underline">
                  Request film pertama lo →
                </Link>
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
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
        onRequestImprovement={handleRemarkClick}
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
