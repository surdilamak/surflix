/**
 * Guest layout — PortalBar (local + site links) + content + Footer
 */
'use client';

import { useEffect, useState } from 'react';
import localFont from 'next/font/local';
import './request.css';
import { TopNav } from '@/components/ui/top-nav';
import { Footer } from '@/components/ui/footer';
import { LangProvider } from '@/components/connections/lang-provider';
import { PortalBar } from '@/components/portal-bar';

// Fonts are vendored in the repo so the build does not need to fetch them from Google.
// Fetching at build time broke CI three times in one day.
// Both are variable fonts under the OFL license; one file covers the whole weight range.
const font = localFont({
  src: '../../public/fonts/bricolage-var-latin.woff2',
  weight: '400 600',
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
      className="rq-root flex min-h-svh flex-col"
      style={{ ['--rq-font' as string]: font.style.fontFamily }}
    >
      <LangProvider>
        <PortalBar current="hub" nav={<TopNav pendingCount={pendingCount} />} />
        <main className="flex-1">{children}</main>
        <Footer />
      </LangProvider>
    </div>
  );
}
