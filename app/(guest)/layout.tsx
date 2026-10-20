/**
 * Guest layout — TopNav + content + Footer + BottomTabBar
 */
'use client';

import { useEffect, useState } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import './request.css';
import { TopNav } from '@/components/ui/top-nav';
import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { Footer } from '@/components/ui/footer';

const font = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const [guestName, setGuestName] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('surflix_guest_info');
      if (saved) {
        try {
          const { name } = JSON.parse(saved);
          if (name) setGuestName(name);
        } catch {}
      }
    }
  }, []);

  return (
    <div
      className="rq-root flex min-h-svh flex-col pb-20 md:pb-0"
      style={{ ['--rq-font' as string]: font.style.fontFamily }}
    >
      <TopNav guestName={guestName} pendingCount={pendingCount} />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomTabBar pendingCount={pendingCount} />
    </div>
  );
}
