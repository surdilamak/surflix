/**
 * Wraps the landing page so poster links can ask for a Jellyfin sign-in: anonymous visitors do not
 * get a direct link into the library (see components/connections/watch-link.tsx).
 */
'use client';

import { LangProvider } from '@/components/connections/lang-provider';
import { ViewerProvider } from '@/components/connections/viewer-provider';
import { WatchLink } from '@/components/connections/watch-link';

export function LandingViewer({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <ViewerProvider>{children}</ViewerProvider>
    </LangProvider>
  );
}

export { WatchLink as LandingWatch };
