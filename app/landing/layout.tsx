/**
 * Landing layout (surflix.my.id) — tile board (direction "dense-tiles" from taste-skill).
 * Deliberately standalone: its fonts, tokens, and CSS are not shared with the Reference portal.
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { translate } from '@/lib/i18n';
import { getServerLang } from '@/lib/lang-server';
import './landing.css';

// Fonts are vendored in the repo so the build does not need to fetch them from Google.
// Fetching at build time broke CI three times in one day.
// Both are variable fonts under the OFL license; one file covers the whole weight range.
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
