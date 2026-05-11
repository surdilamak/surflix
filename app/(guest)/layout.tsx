/**
 * Guest layout — TopNav + content + Footer + BottomTabBar
 */
'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/ui/top-nav';
import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { Footer } from '@/components/ui/footer';

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
    <div className="flex min-h-screen flex-col bg-black pb-20 md:pb-0">
      <TopNav guestName={guestName} pendingCount={pendingCount} />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomTabBar pendingCount={pendingCount} />
    </div>
  );
}
