/**
 * Middleware — hostname-based routing
 *
 * Apex domain (surflix.my.id, NO www/request subdomain) → rewrite to /landing
 * Subdomain `request.surflix.my.id` → pass through (Request Hub UI)
 * Old apex `surdilamak.my.id` → also routed to /landing for legacy users
 *
 * Static assets (/_next, /api, /favicon, etc.) — bypass via matcher config.
 */

import { NextResponse, type NextRequest } from 'next/server';

const APEX_HOSTNAMES = new Set([
  'surflix.my.id',
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
