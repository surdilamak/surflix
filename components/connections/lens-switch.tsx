/**
 * LensSwitch — tiga cara memandang SATU judul: petanya, urutan tontonnya, dan posisinya di langit.
 *
 * Dipasang di ketiga halaman itu dan selalu menunjuk judul yang sedang dilihat, bukan beranda
 * fiturnya. Lensa yang tidak berlaku tidak ditampilkan: judul tanpa saga tidak punya urutan tonton,
 * judul tanpa koneksi tidak punya peta.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useLang } from './lang-provider';

export type Lens = 'map' | 'order' | 'galaxy';

export function LensSwitch({
  current,
  mediaType,
  tmdbId,
  sagaId,
  hasMap = true,
  className,
}: {
  current: Lens;
  mediaType: string;
  tmdbId: number;
  /** id saga kalau judul ini punya urutan tonton; kosong = lensa itu tidak berlaku */
  sagaId?: string | null;
  hasMap?: boolean;
  className?: string;
}) {
  const { portalPath } = usePortal();
  const { t } = useLang();
  const film = `${mediaType}:${tmdbId}`;

  const items: Array<{ k: Lens; href: string; label: string }> = [
    ...(hasMap ? [{ k: 'map' as Lens, href: portalPath(`/${mediaType}/${tmdbId}`) || '/', label: t('lens.map') }] : []),
    ...(sagaId
      ? [{
          k: 'order' as Lens,
          href: `${portalPath(`/timeline/${sagaId}`) || `/timeline/${sagaId}`}?film=${film}`,
          label: t('nav.timeline'),
        }]
      : []),
    { k: 'galaxy', href: `${portalPath('/galaxy') || '/galaxy'}?select=${film}`, label: t('nav.galaxy') },
  ];

  if (items.length < 2) return null;

  return (
    <nav className={`ref-lens${className ? ` ${className}` : ''}`} aria-label={t('lens.label')}>
      {items.map((it) =>
        it.k === current ? (
          <span key={it.k} aria-current="page">
            {it.label}
          </span>
        ) : (
          <a key={it.k} href={it.href}>
            {it.label}
          </a>
        )
      )}
    </nav>
  );
}
