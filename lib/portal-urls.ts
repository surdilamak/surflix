/**
 * URL helper buat tiga situs Surflix (landing, Request Hub, Reference). Fungsi murni:
 * dipakai server component (landing) dan hook client (use-portal).
 *
 * Production: reference.surflix.my.id (portal) dan request.surflix.my.id (hub).
 * Lokal (localhost / IP): portal ada di /referensi, hub di /.
 * Di host reference.*, middleware nge-rewrite semua path ke /referensi/*, jadi path-nya bersih.
 */
export interface PortalUrls {
  /** Path di dalam portal, mis. portalPath('/movie/62') */
  portalPath: (p?: string) => string;
  /** Link ke portal Reference dari mana pun (absolute di production) */
  referenceHref: (p?: string) => string;
  /** Link ke Request Hub dari mana pun */
  hubHref: (p?: string) => string;
  /** Link ke landing (surflix.my.id) */
  homeHref: (p?: string) => string;
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
    homeHref: (p = '') => (root ? `${protocol}//${root}${p}` : `/landing${p}`),
  };
}
