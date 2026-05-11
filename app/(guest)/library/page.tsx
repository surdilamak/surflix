/**
 * Library Page (/library)
 * Browse media yang udah available di Jellyfin
 * Pakai discover endpoint Jellyseerr dengan filter status=5
 */
'use client';

import { useEffect, useState } from 'react';
import { JellyseerrMediaItem } from '@/lib/jellyseerr';
import { PosterCard } from '@/components/ui/poster-card';
import { DetailModal } from '@/components/ui/detail-modal';
import { PosterGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Icons } from '@/components/ui/icons';

export default function LibraryPage() {
  const [items, setItems] = useState<JellyseerrMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<JellyseerrMediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);
    try {
      // Fetch trending dulu, terus filter yang udah di library
      // (Karena Jellyseerr gak punya endpoint khusus "library only" yang public)
      // Untuk implementasi yang lebih baik, lo bisa buat custom endpoint di API kita
      // yang call Jellyseerr's request endpoint dengan filter "available"
      const res = await fetch('/api/library');
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setItems(data.results || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-5 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            <span className="inline-flex items-center gap-2">
              <Icons.Library className="h-5 w-5 md:h-6 md:w-6" />
              Library
            </span>
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Semua film & series yang udah ada di Jellyfin
          </p>
        </div>
        <a
          href={process.env.NEXT_PUBLIC_JELLYFIN_URL || '#'}
          target="_blank"
          rel="noopener"
          className="btn-secondary text-xs"
        >
          <span className="inline-flex items-center gap-1.5">
            <Icons.ExternalLink className="h-3 w-3" />
            Open Jellyfin
          </span>
        </a>
      </div>

      {loading ? (
        <PosterGridSkeleton count={10} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="Library"
          title="Library lagi loading"
          description="Belum ada data library yang ke-load. Coba refresh sebentar."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <PosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onClick={() => {
                setSelectedItem(item);
                setDetailOpen(true);
              }}
            />
          ))}
        </div>
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
