/**
 * Portal Referensi layout — terpisah dari Request Hub (tanpa TopNav/BottomTabBar hub).
 * Served di reference.surflix.my.id (middleware rewrite ke /referensi/*) atau /referensi di lokal.
 *
 * Arah visual: taste-skill "contact sheet" — Schibsted Grotesk, navy on white,
 * bidang gelap di pembuka, satu aksen tangerine buat aksi utama.
 */
import type { Metadata } from 'next';
import { Schibsted_Grotesk } from 'next/font/google';
import { PortalHeader } from '@/components/connections/portal-header';
import { PortalFooter } from '@/components/connections/portal-footer';
import './referensi.css';

const font = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Surflix Referensi — film dan jejaknya',
  description: 'Peta referensi antar film di rak Surflix: homage, terinspirasi, dan referensi visual.',
};

export default function ReferensiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ref-root ${font.className}`}>
      {/* Konten yang muncul saat scroll tetap kelihatan kalau script gagal */}
      <noscript>
        <style>{'.ref-reveal{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      <PortalHeader />
      {children}
      <PortalFooter />
    </div>
  );
}
