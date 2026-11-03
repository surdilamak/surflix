/**
 * Reference Portal layout — separate from Request Hub.
 * Served at reference.surflix.my.id (middleware rewrites to /referensi/*) or /referensi locally.
 *
 * Visual direction: taste-skill "contact sheet" — Schibsted Grotesk, navy on white,
 * a dark field at the opening, one tangerine accent for the main action.
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { PortalHeader } from '@/components/connections/portal-header';
import { PortalFooter } from '@/components/connections/portal-footer';
import { LangProvider } from '@/components/connections/lang-provider';
import { ViewerProvider } from '@/components/connections/viewer-provider';
import { PortalBar } from '@/components/portal-bar';
import './referensi.css';

// Fonts are vendored in the repo so the build does not need to fetch them from Google.
// Fetching at build time broke CI three times in one day.
// Both are variable fonts under the OFL license; one file covers the whole weight range.
const font = localFont({
  src: '../../public/fonts/schibsted-var-latin.woff2',
  weight: '400 800',
  display: 'swap',
});

export const metadata: Metadata = {
  // Absolute URL for og:image / canonical (link previews need the full URL)
  metadataBase: new URL(process.env.NEXT_PUBLIC_REFERENCE_URL || 'https://reference.surflix.my.id'),
  title: 'Surflix Reference: every film leaves a trail',
  description: 'A map of how the films and series on Surflix connect: homages, borrowed looks, shared directors and shared universes.',
  openGraph: {
    title: 'Surflix Reference: every film leaves a trail',
    description: 'A map of how the films and series on Surflix connect.',
    siteName: 'Surflix Reference',
    type: 'website',
    images: [{ url: '/api/og/default', width: 1200, height: 630, alt: 'Surflix Reference' }],
  },
  twitter: { card: 'summary_large_image', images: ['/api/og/default'] },
};

export default function ReferensiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ref-root ${font.className}`}>
      {/* Content that appears on scroll stays visible if the script fails */}
      <noscript>
        <style>{'.ref-reveal{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      <LangProvider>
        <ViewerProvider>
          <PortalBar current="reference" nav={<PortalHeader />} />
          {children}
          <PortalFooter />
        </ViewerProvider>
      </LangProvider>
    </div>
  );
}
