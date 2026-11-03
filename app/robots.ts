/**
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
