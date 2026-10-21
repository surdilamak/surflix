/**
 * Layout root admin (login + halaman admin): font Bricolage Grotesque dan CSS ad-.
 * Sengaja berdiri sendiri, sama seperti landing dan Request Hub, supaya admin tidak ikut token lama.
 */
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import './admin.css';

const font = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Surflix Admin',
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`ad-root ${font.className}`}>{children}</div>;
}
