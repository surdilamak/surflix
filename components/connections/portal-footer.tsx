/**
 * PortalFooter — satu baris tenang: apa ini, tautan, tahun.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useLang } from './lang-provider';

export function PortalFooter() {
  const { hubHref } = usePortal();
  const config = useAppConfig();
  const { t } = useLang();

  return (
    <footer className="ref-footer">
      <span>{t('footer.what')}</span>
      <nav>
        <a href={hubHref('/')}>{t('nav.hub')}</a>
        {config?.jellyfinUrl && (
          <a href={config.jellyfinUrl} target="_blank" rel="noopener">
            {t('detail.watch')}
          </a>
        )}
      </nav>
      <span>{new Date().getFullYear()}</span>
    </footer>
  );
}
