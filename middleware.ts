/**
 * Middleware — hostname-based routing
 *
 * Landing page hostnames (rewrites `/` → `/landing`):
 * - surflix.my.id (apex)
 * - www.surflix.my.id
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

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.toLowerCase().split(':')[0] ?? '';
  const { pathname } = request.nextUrl;

  // Only rewrite root path on apex — preserves other routes (e.g. /api/*) on any hostname
  if (APEX_HOSTNAMES.has(hostname) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all paths except static assets & API
    '/((?!api|_next/static|_next/image|favicon|icon-|logo-|manifest|.*\\..*).*)',
  ],
};
