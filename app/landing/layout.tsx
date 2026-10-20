/**
 * Landing layout (surflix.my.id) — papan ubin (direction "dense-tiles" dari taste-skill).
 * Sengaja berdiri sendiri: font, token, dan CSS-nya tidak dipakai bersama portal Reference.
 */
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import './landing.css';

const font = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Surflix: a private cinema for friends and family',
  description:
    'Hand-picked films and series to watch, a request desk for what is missing, and a map of how titles connect. No ads, no tracking.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp-root ${font.className}`}>
      {children}
    </div>
  );
}
