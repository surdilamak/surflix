/**
 * usePortal — URL helper for the Reference portal <-> Request Hub (logic in lib/portal-urls.ts,
 * kept separate so server components can use it too).
 */
'use client';

import { useEffect, useState } from 'react';
import { buildPortalUrls, type PortalUrls } from '@/lib/portal-urls';

export { buildPortalUrls };

export function usePortal(): PortalUrls {
  // Safe default for SSR / before mount (same on server & client to avoid a hydration mismatch)
  const [urls, setUrls] = useState<PortalUrls>(() => buildPortalUrls('', 'https:'));

  useEffect(() => {
    setUrls(buildPortalUrls(window.location.hostname, window.location.protocol));
  }, []);

  return urls;
}
