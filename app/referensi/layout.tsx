/**
 * Portal Referensi layout — terpisah dari Request Hub.
 * Served di reference.surflix.my.id (middleware rewrite ke /referensi/*) atau /referensi di lokal.
 *
 * Arah visual: taste-skill "contact sheet" — Schibsted Grotesk, navy on white,
 * bidang gelap di pembuka, satu aksen tangerine buat aksi utama.
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { PortalHeader } from '@/components/connections/portal-header';
import { PortalFooter } from '@/components/connections/portal-footer';
import { LangProvider } from '@/components/connections/lang-provider';
import { PortalBar } from '@/components/portal-bar';
import './referensi.css';

// Font di-vendor ke repo supaya build tidak perlu mengambilnya dari Google.
// Pengambilan saat build sempat menggagalkan CI tiga kali dalam satu hari.
// Keduanya variable font berlisensi OFL; satu berkas melayani seluruh rentang berat.
const font = localFont({
  src: '../../public/fonts/schibsted-var-latin.woff2',
  weight: '400 800',
  display: 'swap',
});

export const metadata: Metadata = {
  // URL absolut buat og:image / canonical (preview link butuh URL penuh)
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
      {/* Konten yang muncul saat scroll tetap kelihatan kalau script gagal */}
      <noscript>
        <style>{'.ref-reveal{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      <LangProvider>
        <PortalBar current="reference" nav={<PortalHeader />} />
        {children}
        <PortalFooter />
      </LangProvider>
    </div>
  );
}
