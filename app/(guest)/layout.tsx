/**
 * Guest layout — apply ke semua halaman public
 * Includes TopNav (desktop) + BottomTabBar (mobile)
 */
'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/ui/top-nav';
import { BottomTabBar } from '@/components/ui/bottom-tab-bar';

const GUEST_INFO_KEY = 'surflix_guest_info';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const [guestName, setGuestName] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Get guest info dari localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(GUEST_INFO_KEY);
      if (saved) {
        try {
          const { name } = JSON.parse(saved);
          if (name) setGuestName(name);
        } catch {}
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-black pb-20 md:pb-0">
      <TopNav guestName={guestName} pendingCount={pendingCount} />
      <main>{children}</main>
      <BottomTabBar pendingCount={pendingCount} />
    </div>
  );
}
