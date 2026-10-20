/**
 * PortalHeader — bar polos: wordmark, dua link, satu aksi. Duduk di atas bidang gelap.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';

export function PortalHeader() {
  const { portalPath, hubHref } = usePortal();
  const config = useAppConfig();

  return (
    <header className="ref-header">
      <a href={portalPath('/') || '/'} className="ref-wordmark">
        Surflix Referensi
      </a>
      <nav className="ref-nav">
        <a href={`${portalPath('/') || '/'}#peta`}>Semua peta</a>
        <a href={hubHref('/')}>Request Hub</a>
        {config?.jellyfinUrl && (
          <a href={config.jellyfinUrl} target="_blank" rel="noopener">
            Tonton
          </a>
        )}
      </nav>
    </header>
  );
}
