/**
 * Branded 404. Until 2026-10-23 there was no not-found.tsx at all, so every
 * typo fell through to Next's default screen — black text on white, with no
 * way out, on a site that is entirely dark.
 *
 * Uses the landing's visual language (lp-*) because it serves all three hosts: even on
 * reference.*, an unknown path ends up here.
 *
 * The four destinations are laid out as a 2x2 grid, not a bulleted list: a left-aligned
 * list in a narrow column leaves a gaping right margin (finding `off-centre`),
 * and a page this short leaves half the screen empty unless its content is
 * vertically centered (`hero-void`).
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './landing/landing.css';
import './(legal)/legal.css';

const font = localFont({
  src: '../public/fonts/bricolage-var-latin.woff2',
  weight: '400 600',
  display: 'swap',
});

export const metadata: Metadata = { title: 'Not found · Surflix' };

const PLACES = [
  { href: 'https://surflix.my.id', name: 'Surflix', what: 'the three sites, in one place' },
  { href: 'https://request.surflix.my.id', name: 'Request Hub', what: 'ask for a film or series' },
  { href: 'https://reference.surflix.my.id', name: 'Reference', what: 'how the films connect' },
  { href: 'https://streaming.surflix.my.id', name: 'Streaming', what: 'watch what is already here' },
];

export default function NotFound() {
  return (
    <div className={`lp-root ${font.className}`}>
      <main className="lg-404">
        <h1>This page isn&apos;t here</h1>
        <p className="lg-lede">
          The address may be mistyped, or the page may have moved. Here is everything Surflix has.
        </p>

        <div className="lg-404-links">
          {PLACES.map((p) => (
            <a key={p.href} href={p.href}>
              <strong>{p.name}</strong>
              <span>{p.what}</span>
            </a>
          ))}
        </div>

        <nav className="lg-foot">
          <a href="https://surflix.my.id/terms">Terms of Use</a>
          <a href="https://surflix.my.id/privacy">Privacy Notice</a>
          <a href="mailto:admin@surflix.my.id">admin@surflix.my.id</a>
        </nav>
      </main>
    </div>
  );
}
