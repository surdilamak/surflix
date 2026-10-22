/**
 * Guest layout — PortalBar (tautan lokal + situs) + content + Footer
 */
'use client';

import { useEffect, useState } from 'react';
import localFont from 'next/font/local';
import './request.css';
import { TopNav } from '@/components/ui/top-nav';
import { Footer } from '@/components/ui/footer';
import { LangProvider } from '@/components/connections/lang-provider';
import { PortalBar } from '@/components/portal-bar';

// Font di-vendor ke repo supaya build tidak perlu mengambilnya dari Google.
// Pengambilan saat build sempat menggagalkan CI tiga kali dalam satu hari.
// Keduanya variable font berlisensi OFL; satu berkas melayani seluruh rentang berat.
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
