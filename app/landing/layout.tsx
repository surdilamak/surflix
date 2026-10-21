/**
 * Landing layout (surflix.my.id) — papan ubin (direction "dense-tiles" dari taste-skill).
 * Sengaja berdiri sendiri: font, token, dan CSS-nya tidak dipakai bersama portal Reference.
 */
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { translate } from '@/lib/i18n';
import { getServerLang } from '@/lib/lang-server';
import './landing.css';

const font = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
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
