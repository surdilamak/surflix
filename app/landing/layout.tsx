/**
 * Landing layout (surflix.my.id) — memakai bahasa visual yang sama dengan portal Reference:
 * Schibsted Grotesk, bidang gelap + bidang terang, tombol persegi, satu aksen tangerine.
 */
import type { Metadata } from 'next';
import { Schibsted_Grotesk } from 'next/font/google';
import '../referensi/referensi.css';
import './landing.css';

const font = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Surflix: a private cinema for people who love film',
  description:
    'A private library of films and series, picked by hand. Watch, request what is missing, and see how titles connect. No ads, no tracking.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ref-root ${font.className}`}>
      {/* Konten yang muncul saat scroll tetap kelihatan kalau script gagal */}
      <noscript>
        <style>{'.ref-reveal{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      {children}
    </div>
  );
}
