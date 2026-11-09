/**
 * Wraps the landing page so poster links can ask for a sign-in: anonymous visitors do not
 * get a direct link into the library (see components/connections/watch-link.tsx).
 */
'use client';

import { LangProvider } from '@/components/connections/lang-provider';
import { ViewerProvider } from '@/components/connections/viewer-provider';
import { AccountMenu } from '@/components/connections/account-menu';
import { PortalBar } from '@/components/portal-bar';
import { useRouter } from 'next/navigation';
import { WatchLink } from '@/components/connections/watch-link';

export function LandingViewer({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <ViewerProvider>{children}</ViewerProvider>
    </LangProvider>
  );
}

export { WatchLink as LandingWatch };

/**
 * The same top bar as Reference and Request Hub (logo, site pill, language, account), so the three
 * sites read as one. No site is active here. The landing text is rendered on the server, so a
 * language pick re-renders the page after the choice is stored.
 */
export function LandingBar() {
  const router = useRouter();
  const refresh = () => {
    // ?lang= in the URL overrides the cookie; drop it so the new choice takes effect
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    router.refresh();
  };
  return <PortalBar onLangChange={refresh} account={<AccountMenu />} accountPanel={<AccountMenu inline />} />;
}
