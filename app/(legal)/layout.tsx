/**
 * Layout halaman legal (surflix.my.id/terms, /privacy).
 *
 * Halaman legal dimiliki apex, bukan Request Hub atau Reference: isinya menjelaskan
 * layanan secara keseluruhan, jadi satu salinan untuk ketiga situs. Footer ketiga
 * situs menautnya secara absolut lewat homeHref().
 *
 * Memakai bahasa visual dan font landing (lp-*), karena ia memang halaman apex.
 * English saja, mengikuti landing — lihat CLAUDE.md, landing belum diterjemahkan.
 */
import localFont from 'next/font/local';
import '../landing/landing.css';
import './legal.css';

const font = localFont({
  src: '../../public/fonts/bricolage-var-latin.woff2',
  weight: '400 600',
  display: 'swap',
});

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <div className={`lp-root ${font.className}`}>{children}</div>;
}
