/**
 * Landing layout (surflix.my.id) — papan ubin (direction "dense-tiles" dari taste-skill).
 * Sengaja berdiri sendiri: font, token, dan CSS-nya tidak dipakai bersama portal Reference.
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { translate } from '@/lib/i18n';
import { getServerLang } from '@/lib/lang-server';
import './landing.css';

// Font di-vendor ke repo supaya build tidak perlu mengambilnya dari Google.
// Pengambilan saat build sempat menggagalkan CI tiga kali dalam satu hari.
// Keduanya variable font berlisensi OFL; satu berkas melayani seluruh rentang berat.
const font = localFont({
  src: '../../public/fonts/bricolage-var-latin.woff2',
  weight: '400 600',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return { title: translate(lang, 'lp.meta.title'), description: translate(lang, 'lp.meta.desc') };
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp-root ${font.className}`}>
      {children}
    </div>
  );
}
