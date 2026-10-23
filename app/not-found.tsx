/**
 * 404 bermerek. Sampai 2026-10-23 tidak ada not-found.tsx sama sekali, jadi tiap
 * salah ketik jatuh ke layar bawaan Next — tulisan hitam di atas putih, tanpa
 * jalan keluar, di situs yang seluruhnya gelap.
 *
 * Memakai bahasa visual landing (lp-*) karena ia melayani ketiga host: di
 * reference.* sekalipun, path yang tidak dikenal berakhir di sini.
 *
 * Empat tujuan disajikan sebagai kisi 2x2, bukan daftar berpoin: daftar rata
 * kiri di kolom sempit meninggalkan margin kanan menganga (temuan `off-centre`),
 * dan halaman sependek ini menyisakan separuh layar kosong kalau isinya tidak
 * ditaruh di tengah tegak (`hero-void`).
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
