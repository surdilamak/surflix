/**
 * URL helper for the three Surflix sites (landing, Request Hub, Reference). Pure functions:
 * used by the server component (landing) and the client hook (use-portal).
 *
 * Production: reference.surflix.my.id (portal) and request.surflix.my.id (hub).
 * Local (localhost / IP): the portal is at /referensi, the hub at /.
 * On the reference.* host, the middleware rewrites all paths to /referensi/*, so the paths stay clean.
 */
export interface PortalUrls {
  /** Path inside the portal, e.g. portalPath('/movie/62') */
  portalPath: (p?: string) => string;
  /** Link to the Reference portal from anywhere (absolute in production) */
  referenceHref: (p?: string) => string;
  /** Link to the Request Hub from anywhere */
  hubHref: (p?: string) => string;
  /** Link to the landing (surflix.my.id) */
  homeHref: (p?: string) => string;
}

/** Root domain from the hostname: reference.x.y / request.x.y / www.x.y / x.y -> x.y. localhost & IP -> undefined. */
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
