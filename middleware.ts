/**
 * Middleware — hostname-based routing
 *
 * Landing page hostname (rewrites `/` → `/landing`):
 * - surflix.my.id (apex — the only canonical host for the landing)
 *
 * www.surflix.my.id: redirected with 308 to the apex, all paths.
 *
 * Reference portal hostnames (rewrites everything → `/referensi/*`):
 * - reference.surflix.my.id (film reference map portal, separate from the Request Hub)
 *
 * Apex other than '/': redirected with 308 to the host that owns it (see the reason below).
 * Legal (/terms, /privacy): live only on the apex; subdomains are redirected there.
 *
 * Pass-through hostnames (render Request Hub or other routes normally):
 * - request.surflix.my.id (Request Hub UI)
 *
 * Streaming: streaming.surflix.my.id → Jellyfin (not this app, handled by NPM)
 *
 * Legacy domains (also rewritten to landing for transition):
 * - surdilamak.my.id, www.surdilamak.my.id
 *
 * Static assets (/_next, /api, /favicon, etc.) — bypass via matcher config.
 */

import { NextResponse, type NextRequest } from 'next/server';

/**
 * Canonical host. `www.*` is deliberately NOT here: it is redirected to the apex first
 * (see the first rule in the middleware), so only one host claims to be the apex.
 */
const APEX_HOSTNAMES = new Set([
  'surflix.my.id',
  // Legacy support — if anyone still hits these via DNS redirect
  'surdilamak.my.id',
]);

const REFERENCE_HOSTNAMES = new Set(['reference.surflix.my.id']);

/** Legal pages are owned by the apex: one copy for all three sites. */
const LEGAL_PATHS = new Set(['/terms', '/privacy']);

/** surflix.my.id from any hostname. undefined on localhost / IP (dev). */
function apexOf(hostname: string): string | undefined {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
  const stripped = hostname.replace(/^(reference|request|www)\./, '');
  return stripped.includes('.') ? stripped : undefined;
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.toLowerCase().split(':')[0] ?? '';
  const { pathname } = request.nextUrl;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0] ?? 'https';
  const apex = apexOf(hostname);

  // www is not a canonical host — the apex is the canonical one, on par with request.*,
  // reference.*, and streaming.*, none of which use www.
  //
  // Until 2026-10-23 this redirect was done by NPM, and nobody
  // could see it from the repo. As soon as the apex tunnel route was pointed directly at
  // the app (no longer through NPM), that redirect disappeared and
  // www.surflix.my.id started serving a second copy of the landing. The rule moved to
  // here so it lives in code and is read together with the other host rules.
  if (apex && hostname.startsWith('www.')) {
    return NextResponse.redirect(`${proto}://${apex}${pathname}${request.nextUrl.search}`, 308);
  }

  // Legal pages live only on the apex. From any subdomain, send them there —
  // so /terms and /privacy have one URL, not three.
  if (apex && LEGAL_PATHS.has(pathname) && !APEX_HOSTNAMES.has(hostname)) {
    return NextResponse.redirect(`${proto}://${apex}${pathname}`, 308);
  }

  // Reference portal: all paths (except /api & assets, see matcher) go to /referensi/*
  if (REFERENCE_HOSTNAMES.has(hostname) && !pathname.startsWith('/referensi')) {
    const url = request.nextUrl.clone();
    url.pathname = `/referensi${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (APEX_HOSTNAMES.has(hostname)) {
    // The apex home = landing.
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/landing';
      return NextResponse.rewrite(url);
    }

    // The rest: send to the host that owns the page.
    //
    // Until 2026-10-23 paths other than '/' passed through as-is on the apex, so EVERY page
    // had a second URL with identical content and no canonical — surflix.my.id/browse
    // was exactly the same as request.surflix.my.id/browse, and surflix.my.id/admin
    // opened the admin login screen on the wrong host. A 308 redirect closes both
    // at once: one URL per page, and admin in only one place.
    //
    // A redirect was chosen, not a canonical tag: canonical only gives a hint to search
    // engines, both URLs stay alive and admin stays reachable.
    if (apex && !LEGAL_PATHS.has(pathname)) {
      const target = pathname.startsWith('/referensi')
        ? `${proto}://reference.${apex}${pathname.slice('/referensi'.length) || '/'}`
        : `${proto}://request.${apex}${pathname}`;
      return NextResponse.redirect(`${target}${request.nextUrl.search}`, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all paths except static assets & API
    '/((?!api|_next/static|_next/image|favicon|icon-|logo-|manifest|.*\\..*).*)',
  ],
};
