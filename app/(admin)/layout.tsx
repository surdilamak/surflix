/**
 * Admin root layout (login + admin pages): Bricolage Grotesque font and the ad- CSS.
 * Deliberately standalone, like the landing and Request Hub, so admin does not inherit the old tokens.
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './admin.css';

// Fonts are vendored in the repo so the build does not need to fetch them from Google.
// Fetching at build time broke CI three times in one day.
// Both are variable fonts under the OFL license; one file covers the whole weight range.
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
