/**
 * Middleware — hostname-based routing
 *
 * Landing page hostnames (rewrites `/` → `/landing`):
 * - surflix.my.id (apex)
 * - www.surflix.my.id
 *
 * Reference portal hostnames (rewrites everything → `/referensi/*`):
 * - reference.surflix.my.id (portal peta referensi film, terpisah dari Request Hub)
 *
 * Apex selain '/': di-redirect 308 ke host pemiliknya (lihat alasannya di bawah).
 * Legal (/terms, /privacy): hanya hidup di apex; subdomain di-redirect ke sana.
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

const APEX_HOSTNAMES = new Set([
  'surflix.my.id',
  'www.surflix.my.id',
  // Legacy support — if anyone still hits these via DNS redirect
  'surdilamak.my.id',
  'www.surdilamak.my.id',
]);

const REFERENCE_HOSTNAMES = new Set(['reference.surflix.my.id']);

/** Halaman legal dimiliki apex: satu salinan untuk ketiga situs. */
const LEGAL_PATHS = new Set(['/terms', '/privacy']);

/** surflix.my.id dari hostname apa pun. undefined di localhost / IP (dev). */
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

  // Halaman legal hanya hidup di apex. Dari subdomain mana pun, antar ke sana —
  // supaya /terms dan /privacy punya satu URL, bukan tiga.
  if (apex && LEGAL_PATHS.has(pathname) && !APEX_HOSTNAMES.has(hostname)) {
    return NextResponse.redirect(`${proto}://${apex}${pathname}`, 308);
  }

  // Portal Referensi: semua path (selain /api & asset, lihat matcher) masuk ke /referensi/*
  if (REFERENCE_HOSTNAMES.has(hostname) && !pathname.startsWith('/referensi')) {
    const url = request.nextUrl.clone();
    url.pathname = `/referensi${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (APEX_HOSTNAMES.has(hostname)) {
    // Beranda apex = landing.
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/landing';
      return NextResponse.rewrite(url);
    }

    // Sisanya: antar ke host yang memiliki halamannya.
    //
    // Sampai 2026-10-23 path selain '/' lolos apa adanya di apex, jadi SETIAP halaman
    // punya URL kedua dengan isi identik dan tanpa canonical — surflix.my.id/browse
    // sama persis dengan request.surflix.my.id/browse, dan surflix.my.id/admin
    // membuka layar login admin di host yang salah. Redirect 308 menutup keduanya
    // sekaligus: satu URL per halaman, dan admin cuma di satu tempat.
    //
    // Dipilih redirect, bukan tag canonical: canonical cuma memberi petunjuk ke mesin
    // pencari, URL keduanya tetap hidup dan admin tetap terbuka.
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
