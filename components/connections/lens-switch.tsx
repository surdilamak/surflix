/**
 * LensSwitch — three ways to look at ONE title: its map, its watch order, and its position in the sky.
 *
 * Mounted on all three pages and always points to the title being viewed, not the feature's
 * home. A lens that doesn't apply is not shown: a title without a saga has no watch order,
 * a title without connections has no map.
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
  /** saga id if this title has a watch order; empty = that lens doesn't apply */
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
