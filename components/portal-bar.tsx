/**
 * PortalBar — the same single bar on top of Request Hub and Reference, one line: logo (to landing)
 * + portal name, local links, site choice (pill, the active one orange) and language choice.
 * The bar sticks to the top (sticky) on all pages.
 * On phones: site pill + hamburger button; the hamburger menu holds local links, language, and
 * a link to the Surflix home. Colors via --pb-bg / --pb-ink so it blends into each site's dark surface.
 */
'use client';

import { useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePortal } from '@/lib/hooks/use-portal';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { useLang } from '@/components/connections/lang-provider';
import './portal-bar.css';

export type PortalSite = 'hub' | 'reference';

function LangPills({ className, onChange }: { className?: string; onChange?: (l: 'en' | 'id') => void }) {
  const { t, lang, setLang } = useLang();
  return (
    <span className={className} role="group" aria-label={t('pb.lang')}>
      {(['en', 'id'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => {
            setLang(l);
            onChange?.(l);
          }}
          aria-pressed={lang === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

export function PortalBar({
  current,
  nav,
  account,
  accountPanel,
  onLangChange,
}: {
  /** the site the visitor is on; leave out on the landing page, where no site pill is active */
  current?: PortalSite;
  /** called after the language is picked (the landing page re-renders its server text here) */
  onLangChange?: (l: 'en' | 'id') => void;
  /** account entry at the far right of the bar (desktop) and its version inside the phone menu */
  account?: React.ReactNode;
  accountPanel?: React.ReactNode;
  /** the site's local links (Home/Trending…, All maps/Galaxy) sitting on the same line */
  nav?: React.ReactNode;
}) {
  const { homeHref, hubHref, referenceHref } = usePortal();
  const config = useAppConfig();
  const { t } = useLang();
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  // transparent at the top of the page, a glass layer once the page has scrolled (like the RomM header)
  const [scrolled, setScrolled] = useState(false);
  const streaming = config?.jellyfinUrl || 'https://streaming.surflix.my.id';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on page change or when Escape is pressed
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const items: Array<{ key: string; href: string; label: React.ReactNode; site?: PortalSite; external?: boolean }> = [
    { key: 'reference', href: referenceHref('/'), site: 'reference', label: t('pb.reference') },
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
    { key: 'streaming', href: streaming, label: t('pb.streaming'), external: true },
  ];

  return (
    <div className="pb-bar" data-open={open ? '' : undefined} data-scrolled={scrolled ? '' : undefined}>
      <div className="pb-in">
        <a href={homeHref('/')} className="pb-logo" aria-label={t('pb.home')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.png" alt="" width={87} height={24} className="pb-wordmark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" width={24} height={24} className="pb-mark" />
        </a>
        {current && <span className="pb-name">{current === 'hub' ? t('pb.hub') : t('pb.reference')}</span>}

        {nav}

        <nav className="pb-switch" aria-label={t('pb.switch')}>
          {items.map((it) => (
            <a
              key={it.key}
              href={it.href}
              aria-current={current && it.site === current ? 'page' : undefined}
              {...(it.external ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {it.label}
            </a>
          ))}
        </nav>

        <LangPills className="pb-lang" onChange={onLangChange} />

        {account}

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
            {accountPanel}
            <div className="pb-panel-foot">
              <LangPills className="pb-lang pb-lang--panel" onChange={onLangChange} />
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
