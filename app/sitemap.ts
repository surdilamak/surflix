/**
 * sitemap.xml sadar-host: tiap situs Surflix menerima sitemap-nya sendiri dari satu route.
 *  - reference.*: beranda, Galaxy, dan setiap peta film yang punya koneksi
 *  - apex / www: landing
 *  - request.*: beranda Request Hub
 * (Path berakhiran .xml tidak lewat middleware, jadi host dibaca langsung di sini.)
 */
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { sitemapFilms } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].split(':')[0].toLowerCase();
  const proto = h.get('x-forwarded-proto')?.split(',')[0] ?? 'https';
  const origin = `${proto}://${host}`;

  if (host.startsWith('reference.')) {
    const films = await sitemapFilms().catch(() => []);
    return [
      { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
      { url: `${origin}/galaxy`, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${origin}/new`, changeFrequency: 'daily', priority: 0.7 },
      ...films.map((f) => ({
        url: `${origin}/${f.mediaType}/${f.tmdbId}`,
        lastModified: f.lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ];
  }
  if (host.startsWith('request.')) {
    return [{ url: `${origin}/`, changeFrequency: 'weekly', priority: 1 }, { url: `${origin}/browse`, changeFrequency: 'daily', priority: 0.6 }];
  }
  return [{ url: `${origin}/`, changeFrequency: 'monthly', priority: 1 }];
}
