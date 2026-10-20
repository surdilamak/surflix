/**
 * PortalHeader — judul situs dan tautan lokal. Pindah situs dan pilihan bahasa ada di PortalBar di atasnya.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useLang } from './lang-provider';

export function PortalHeader() {
  const { portalPath } = usePortal();
  const { t } = useLang();

  return (
    <header className="ref-header">
      <a href={portalPath('/') || '/'} className="ref-wordmark" aria-label="Surflix Reference">
        <span>Surflix</span>
        <span className="ref-wordmark-sub">Reference</span>
      </a>
      <nav className="ref-nav" aria-label="Main">
        <a href={`${portalPath('/') || '/'}#peta`}>{t('nav.maps')}</a>
        <a href={portalPath('/galaxy') || '/galaxy'}>{t('nav.galaxy')}</a>
      </nav>
    </header>
  );
}
