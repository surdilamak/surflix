/**
 * PortalBar — satu bar yang sama di atas Request Hub dan Reference, satu baris: logo (ke landing)
 * + nama portal, tautan lokal, pilihan situs (pill, yang aktif oranye) dan pilihan bahasa.
 * Di telepon: pill situs + tombol hamburger; menu hamburger memuat tautan lokal, bahasa, dan
 * tautan ke beranda Surflix. Warna lewat --pb-bg / --pb-ink supaya menyatu dengan bidang gelap tiap situs.
 */
'use client';

import { useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useLang } from '@/components/connections/lang-provider';
import './portal-bar.css';

export type PortalSite = 'hub' | 'reference';

function LangPills({ className }: { className?: string }) {
  const { t, lang, setLang } = useLang();
  return (
    <span className={className} role="group" aria-label={t('pb.lang')}>
      {(['en', 'id'] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

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
  const { t } = useLang();
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const streaming = config?.jellyfinUrl || 'https://streaming.surflix.my.id';

  // Tutup menu saat pindah halaman atau menekan Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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
    <div className="pb-bar" data-sticky={sticky ? '' : undefined} data-open={open ? '' : undefined}>
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

        <LangPills className="pb-lang" />

        <button
          type="button"
          className="pb-burger"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={t('pb.menu')}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <>
          <button type="button" className="pb-scrim" aria-label={t('pb.close')} onClick={() => setOpen(false)} />
          <div className="pb-panel" id={menuId}>
            {nav}
            <div className="pb-panel-foot">
              <LangPills className="pb-lang pb-lang--panel" />
              <a href={homeHref('/')} className="pb-home-link">
                {t('pb.home')}
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
