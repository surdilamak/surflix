/**
 * Layout root admin (login + halaman admin): font Bricolage Grotesque dan CSS ad-.
 * Sengaja berdiri sendiri, sama seperti landing dan Request Hub, supaya admin tidak ikut token lama.
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './admin.css';

// Font di-vendor ke repo supaya build tidak perlu mengambilnya dari Google.
// Pengambilan saat build sempat menggagalkan CI tiga kali dalam satu hari.
// Keduanya variable font berlisensi OFL; satu berkas melayani seluruh rentang berat.
const font = localFont({
  src: '../../public/fonts/bricolage-var-latin.woff2',
  weight: '400 600',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Surflix Admin',
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`ad-root ${font.className}`}>{children}</div>;
}
