/**
 * PortalFooter — satu baris tenang: apa ini, tautan, tahun.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';

export function PortalFooter() {
  const { hubHref } = usePortal();
  const config = useAppConfig();

  return (
    <footer className="ref-footer">
      <span>Peta referensi film Surflix</span>
      <nav>
        <a href={hubHref('/')}>Request Hub</a>
        {config?.jellyfinUrl && (
          <a href={config.jellyfinUrl} target="_blank" rel="noopener">
            Tonton di Surflix
          </a>
        )}
      </nav>
      <span>{new Date().getFullYear()}</span>
    </footer>
  );
}
