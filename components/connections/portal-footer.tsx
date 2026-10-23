/**
 * PortalFooter — satu baris tenang: apa ini, tautan, tahun.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useLang } from './lang-provider';

export function PortalFooter() {
  const { hubHref, homeHref } = usePortal();
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
        {/* Halaman legal dimiliki apex, jadi ditaut lewat homeHref(): dari subdomain
            mana pun ia menunjuk surflix.my.id, bukan reference.surflix.my.id/terms
            yang akan di-redirect. */}
        <a href={homeHref('/terms')}>{t('footer.terms')}</a>
        <a href={homeHref('/privacy')}>{t('footer.privacy')}</a>
        <a href="mailto:admin@surflix.my.id">{t('footer.contact')}</a>
      </nav>
      <span>{new Date().getFullYear()}</span>
    </footer>
  );
}
