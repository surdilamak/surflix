/**
 * ReferenceSection — tombol "Referensi" di detail modal Request Hub.
 *
 * Portal Referensi dipisah dari Request Hub (reference.surflix.my.id), jadi di sini
 * cuma link keluar. Tombol baru muncul kalau film ini emang punya peta referensi
 * (cek ringan ke /api/connections — approved-only, tanpa LLM).
 */
'use client';

import { useEffect, useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { usePortal } from '@/lib/hooks/use-portal';

interface ReferenceSectionProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
}

export function ReferenceSection({ tmdbId, mediaType }: ReferenceSectionProps) {
  const { referenceHref } = usePortal();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/connections?type=${mediaType}&id=${tmdbId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.edges) setCount(d.edges.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType]);

  if (count === 0) return null;

  return (
    <a
      href={referenceHref(`/${mediaType}/${tmdbId}`)}
      target="_blank"
      rel="noopener"
      className="block w-full rounded-full border border-white/15 bg-white/4 py-2.5 text-center text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:bg-white/8 hover:text-white"
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        <Icons.Sparkles className="h-4 w-4" />
        See the reference map ({count})
        <Icons.ExternalLink className="h-3 w-3 text-white/50" />
      </span>
    </a>
  );
}
