/**
 * PortalBar — satu bar yang sama di atas Request Hub dan Reference, satu baris: logo (ke landing)
 * + nama portal, tautan lokal, pilihan situs (pill, yang aktif oranye) dan pilihan bahasa. Situs yang sedang dibuka
 * ditandai; kalau butuh pindah, satu klik dari mana pun.
 * Warna lewat --pb-bg / --pb-ink supaya menyatu dengan bidang gelap tiap situs.
 */
'use client';

import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useLang } from '@/components/connections/lang-provider';
import './portal-bar.css';

export type PortalSite = 'hub' | 'reference';

export function PortalBar({
  current,
  nav,
  sticky,
}: {
  current: PortalSite;
  /** tautan lokal situs (Home/Trending…, All maps/Galaxy) yang duduk di baris yang sama */
  nav?: React.ReactNode;
  sticky?: boolean;
}) {
  const { homeHref, hubHref, referenceHref } = usePortal();
  const config = useAppConfig();
  const { t, lang, setLang } = useLang();
  const streaming = config?.jellyfinUrl || 'https://streaming.surflix.my.id';

  const items: Array<{ key: string; href: string; label: React.ReactNode; site?: PortalSite; external?: boolean }> = [
    { key: 'streaming', href: streaming, label: t('pb.streaming'), external: true },
    {
      key: 'hub',
      href: hubHref('/'),
      site: 'hub',
      label: (
        <>
          <span className="pb-short">{t('pb.hubShort')}</span>
          <span className="pb-full">{t('pb.hub')}</span>
        </>
      ),
    },
    { key: 'reference', href: referenceHref('/'), site: 'reference', label: t('pb.reference') },
  ];

  return (
    <div className="pb-bar" data-sticky={sticky ? '' : undefined}>
      <div className="pb-in">
        <a href={homeHref('/')} className="pb-logo" aria-label={t('pb.home')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.png" alt="" width={86} height={24} className="pb-wordmark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" width={24} height={24} className="pb-mark" />
        </a>
        <span className="pb-name">{current === 'hub' ? t('pb.hub') : t('pb.reference')}</span>

        {nav}

        <nav className="pb-switch" aria-label={t('pb.switch')}>
          {items.map((it) => (
            <a
              key={it.key}
              href={it.href}
              aria-current={it.site === current ? 'page' : undefined}
              {...(it.external ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {it.label}
            </a>
          ))}
        </nav>

        <span className="pb-lang" role="group" aria-label={t('pb.lang')}>
          {(['en', 'id'] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}>
              {l.toUpperCase()}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
