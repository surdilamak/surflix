/**
 * PortalHeader — tautan lokal Reference (All maps, Watch order, Galaxy, Just added).
 * Duduk di dalam PortalBar, satu baris dengan logo, nama portal, pill situs, dan pilihan bahasa.
 *
 * Menandai halaman yang sedang dibuka dengan aria-current="page" — gayanya sudah ada di
 * portal-bar.css. Sampai 2026-10-23 tautan ini polos semua, jadi dari bilah atas pengunjung
 * tidak bisa tahu ia sedang di halaman mana (Trunk Test gagal). TopNav milik Request Hub
 * sudah melakukannya sejak awal; bagian ini yang tertinggal.
 */
'use client';

import { usePathname } from 'next/navigation';
import { usePortal } from '@/lib/hooks/use-portal';
import { useLang } from './lang-provider';

export function PortalHeader() {
  const { portalPath } = usePortal();
  const { t } = useLang();
  const pathname = usePathname() || '/';

  const home = portalPath('/') || '/';
  const timeline = portalPath('/timeline') || '/timeline';
  const galaxy = portalPath('/galaxy') || '/galaxy';
  const added = portalPath('/new') || '/new';

  /** Cocok kalau persis sama, atau kalau ini induk dari halaman anaknya (/timeline/mcu). */
  const on = (href: string) => {
    const base = href.replace(/\/$/, '');
    return pathname === base || pathname.startsWith(base + '/');
  };
  /**
   * "All maps" menunjuk beranda + jangkar. Ia aktif di beranda DAN di peta satu film,
   * karena peta film adalah isi dari daftar itu — bukan cabang tersendiri.
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
    </nav>
  );
}
