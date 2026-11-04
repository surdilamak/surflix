/**
 * NOTE (2026-11-04): the site is private and every response carries `X-Robots-Tag: noindex` (next.config.js).
 * Crawling is deliberately still allowed and the sitemaps are still served: Google has to fetch a page to
 * see its noindex and drop it from the index. Once Search Console shows the pages gone, switch this to
 * `Disallow: /` and remove the sitemap routes (see BACKLOG.md, "Private site").
 *
 * Host-aware robots.txt. Admin, login, and API are never indexed; guests' private pages
 * (My Requests, verification) are not either. Each host points to its own sitemap.
 */
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].split(':')[0].toLowerCase();
  const proto = h.get('x-forwarded-proto')?.split(',')[0] ?? 'https';
  return {
    rules: [{ userAgent: '*', allow: ['/', '/api/og/'], disallow: ['/admin', '/login', '/api/', '/requests', '/verify'] }],
    sitemap: `${proto}://${host}/sitemap.xml`,
    host: `${proto}://${host}`,
  };
}
