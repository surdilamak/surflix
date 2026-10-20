/**
 * usePortal — URL helper buat portal Referensi <-> Request Hub
 *
 * Production: reference.surflix.my.id (portal) dan request.surflix.my.id (hub).
 * Lokal (localhost): portal ada di /referensi, hub di /.
 * Di host reference.*, middleware nge-rewrite semua path ke /referensi/*, jadi path-nya bersih.
 */
'use client';

import { useEffect, useState } from 'react';

interface PortalUrls {
  /** Path di dalam portal, mis. portalPath('/movie/62') */
  portalPath: (p?: string) => string;
  /** Link ke portal Referensi dari mana pun (absolute di production) */
  referenceHref: (p?: string) => string;
  /** Link ke Request Hub dari mana pun */
  hubHref: (p?: string) => string;
}

/** Root domain dari hostname: reference.x.y / request.x.y / www.x.y / x.y -> x.y. localhost & IP -> undefined. */
function rootDomain(hostname: string): string | undefined {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
  const stripped = hostname.replace(/^(reference|request|www)\./, '');
  return stripped.includes('.') ? stripped : undefined;
}

export function buildPortalUrls(hostname: string, protocol: string): PortalUrls {
  const m = hostname.match(/^(reference|request)\./);
  const root = rootDomain(hostname);
  const onReference = m?.[1] === 'reference';
  const base = onReference ? '' : '/referensi';

  return {
    portalPath: (p = '') => `${base}${p}`,
    referenceHref: (p = '') => (root ? `${protocol}//reference.${root}${p}` : `/referensi${p}`),
    hubHref: (p = '') => (root ? `${protocol}//request.${root}${p}` : p || '/'),
  };
}

export function usePortal(): PortalUrls {
  // Default aman buat SSR / sebelum mount (sama di server & client biar gak hydration mismatch)
  const [urls, setUrls] = useState<PortalUrls>(() => buildPortalUrls('', 'https:'));

  useEffect(() => {
    setUrls(buildPortalUrls(window.location.hostname, window.location.protocol));
  }, []);

  return urls;
}
