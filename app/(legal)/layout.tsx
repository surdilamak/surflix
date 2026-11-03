/**
 * Layout for the legal pages (surflix.my.id/terms, /privacy).
 *
 * The legal pages are owned by the apex, not Request Hub or Reference: they describe
 * the service as a whole, so there is one copy for all three sites. The footers of all three
 * sites link to it absolutely via homeHref().
 *
 * Uses the landing's visual language and font (lp-*), because it is an apex page.
 * English only, following the landing — see CLAUDE.md, the landing is not translated yet.
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
