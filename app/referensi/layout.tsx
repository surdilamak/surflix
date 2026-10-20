/**
 * Portal Referensi layout — terpisah dari Request Hub (tanpa TopNav/BottomTabBar hub).
 * Served di reference.surflix.my.id (middleware rewrite ke /referensi/*) atau /referensi di lokal.
 */
import type { Metadata } from 'next';
import { PortalHeader } from '@/components/connections/portal-header';

export const metadata: Metadata = {
  title: 'Surflix Referensi — peta referensi antar film',
  description: 'Jelajahi film yang saling nyambung: homage, inspired by, dan referensi visual.',
};

export default function ReferensiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <PortalHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      <footer className="border-t border-white/[0.08] px-4 py-6 text-center text-[11px] text-white/40">
        Surflix Referensi · peta referensi film di library Surflix
      </footer>
    </div>
  );
}
