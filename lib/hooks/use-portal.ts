/**
 * usePortal — URL helper buat portal Reference <-> Request Hub (logika di lib/portal-urls.ts,
 * dipisah supaya server component juga bisa memakainya).
 */
'use client';

import { useEffect, useState } from 'react';
import { buildPortalUrls, type PortalUrls } from '@/lib/portal-urls';

export { buildPortalUrls };

export function usePortal(): PortalUrls {
  // Default aman buat SSR / sebelum mount (sama di server & client biar gak hydration mismatch)
  const [urls, setUrls] = useState<PortalUrls>(() => buildPortalUrls('', 'https:'));

  useEffect(() => {
    setUrls(buildPortalUrls(window.location.hostname, window.location.protocol));
  }, []);

  return urls;
}
