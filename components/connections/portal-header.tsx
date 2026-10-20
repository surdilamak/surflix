/**
 * PortalHeader — tautan lokal Reference (All maps, Galaxy). Duduk di dalam PortalBar,
 * satu baris dengan logo, nama portal, pill situs, dan pilihan bahasa.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useLang } from './lang-provider';

export function PortalHeader() {
  const { portalPath } = usePortal();
  const { t } = useLang();

  return (
    <nav className="pb-nav" aria-label="Reference">
      <a href={`${portalPath('/') || '/'}#peta`}>{t('nav.maps')}</a>
      <a href={portalPath('/galaxy') || '/galaxy'}>{t('nav.galaxy')}</a>
    </nav>
  );
}
