/**
 * PortalHeader — local Reference links (All maps, Watch order, Galaxy, Just added).
 * Sits inside PortalBar, on one line with the logo, portal name, site pills, and language choice.
 *
 * Marks the currently open page with aria-current="page" — its style already exists in
 * portal-bar.css. Until 2026-10-23 these links were all plain, so from the top bar a visitor
 * could not tell which page they were on (Trunk Test failed). The Request Hub's TopNav
 * has done this from the start; this part lagged behind.
 */
'use client';

import { usePathname } from 'next/navigation';
import { usePortal } from '@/lib/hooks/use-portal';
import { useLang } from './lang-provider';
import { useViewer } from './viewer-provider';

export function PortalHeader() {
  const { portalPath } = usePortal();
  const { t } = useLang();
  const viewer = useViewer();
  const pathname = usePathname() || '/';

  const home = portalPath('/') || '/';
  const timeline = portalPath('/timeline') || '/timeline';
  const galaxy = portalPath('/galaxy') || '/galaxy';
  const added = portalPath('/new') || '/new';

  /** Matches if exactly equal, or if this is the parent of the child page (/timeline/mcu). */
  const on = (href: string) => {
    const base = href.replace(/\/$/, '');
    return pathname === base || pathname.startsWith(base + '/');
  };
  /**
   * "All maps" points to the home page + anchor. It is active on the home page AND on a single film's map,
   * because a film map is part of that list — not a separate branch.
   */
  const onMaps =
    pathname === home.replace(/\/$/, '') ||
    (!on(timeline) && !on(galaxy) && !on(added) && pathname.replace(/\/$/, '') !== '');

  return (
    <nav className="pb-nav" aria-label="Reference">
      <a href={`${home}#peta`} aria-current={onMaps ? 'page' : undefined}>
        {t('nav.maps')}
      </a>
      <a href={timeline} aria-current={on(timeline) ? 'page' : undefined}>
        {t('nav.timeline')}
      </a>
      <a href={galaxy} aria-current={on(galaxy) ? 'page' : undefined}>
        {t('nav.galaxy')}
      </a>
      <a href={added} aria-current={on(added) ? 'page' : undefined}>
        {t('nav.new')}
      </a>
      {viewer.status !== 'loading' && (
        <button
          type="button"
          className="ref-viewer-btn"
          onClick={viewer.status === 'in' ? viewer.logout : viewer.openLogin}
          title={viewer.status === 'in' ? t('viewer.signout') : undefined}
        >
          {viewer.status === 'in' ? t('viewer.hello', { name: viewer.name ?? '' }) : t('viewer.signin')}
        </button>
      )}
    </nav>
  );
}
