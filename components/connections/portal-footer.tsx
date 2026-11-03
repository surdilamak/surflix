/**
 * PortalFooter — one calm line: what this is, links, year.
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
        {/* Legal pages are owned by the apex, so they are linked via homeHref(): from any
            subdomain it points to surflix.my.id, not reference.surflix.my.id/terms
            which would be redirected. */}
        <a href={homeHref('/terms')}>{t('footer.terms')}</a>
        <a href={homeHref('/privacy')}>{t('footer.privacy')}</a>
        <a href="mailto:admin@surflix.my.id">{t('footer.contact')}</a>
      </nav>
      <span>{new Date().getFullYear()}</span>
    </footer>
  );
}
