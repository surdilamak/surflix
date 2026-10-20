/**
 * PortalHeader — bar polos: wordmark, tautan, pilihan bahasa. Duduk di atas bidang gelap.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useLang } from './lang-provider';

export function PortalHeader() {
  const { portalPath, hubHref } = usePortal();
  const config = useAppConfig();
  const { t, lang, setLang } = useLang();

  return (
    <header className="ref-header">
      <a href={portalPath('/') || '/'} className="ref-wordmark">
        Surflix Referensi
      </a>
      <nav className="ref-nav" aria-label="Main">
        <a href={`${portalPath('/') || '/'}#peta`}>{t('nav.maps')}</a>
        <a href={portalPath('/galaxy') || '/galaxy'}>{t('nav.galaxy')}</a>
        <a href={hubHref('/')}>{t('nav.hub')}</a>
        {config?.jellyfinUrl && (
          <a href={config.jellyfinUrl} target="_blank" rel="noopener" className="ref-nav-watch">
            {t('nav.watch')}
          </a>
        )}
        <span className="ref-lang" role="group" aria-label={t('nav.lang')}>
          {(['en', 'id'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              data-on={lang === l ? '' : undefined}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </span>
      </nav>
    </header>
  );
}
