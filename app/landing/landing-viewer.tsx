/**
 * Wraps the landing page so poster links can ask for a Jellyfin sign-in: anonymous visitors do not
 * get a direct link into the library (see components/connections/watch-link.tsx).
 */
'use client';

import { LangProvider } from '@/components/connections/lang-provider';
import { ViewerProvider } from '@/components/connections/viewer-provider';
import { useViewer } from '@/components/connections/viewer-provider';
import { WatchLink } from '@/components/connections/watch-link';

export function LandingViewer({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <ViewerProvider>{children}</ViewerProvider>
    </LangProvider>
  );
}

export { WatchLink as LandingWatch };

/** Sign in / account chip next to the language picker. Labels come from the server translation. */
export function LandingAccount({ labels }: { labels: { signin: string; signout: string; as: string } }) {
  const viewer = useViewer();
  if (viewer.status === 'loading') return null;
  if (viewer.status === 'out') {
    return (
      <button type="button" className="lp-account" onClick={viewer.openLogin}>
        {labels.signin}
      </button>
    );
  }
  return (
    <span className="lp-account lp-account--in">
      <span className="lp-account-name">{labels.as.replace('{name}', viewer.name ?? '')}</span>
      <button type="button" onClick={viewer.logout}>{labels.signout}</button>
    </span>
  );
}
