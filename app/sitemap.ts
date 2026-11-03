/**
 * Host-aware sitemap.xml: each Surflix site gets its own sitemap from one route.
 *  - reference.*: home, Galaxy, Watch order, Just added, EVERY saga page, and
 *    every film map that has connections
 *  - apex / www: landing
 *  - request.*: all public pages (home, browse, trending, library)
 * (Paths ending in .xml do not go through middleware, so the host is read directly here.)
 */
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { listSagas, sitemapFilms } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].split(':')[0].toLowerCase();
  const proto = h.get('x-forwarded-proto')?.split(',')[0] ?? 'https';
  const origin = `${proto}://${host}`;

  if (host.startsWith('reference.')) {
    // listSagas() is exactly the same list that the /timeline index renders,
    // so the sitemap and the index cannot drift apart. Saga pages carry hand curation
    // (name, tip, track, story order, per-title notes) - the richest content in this portal,
    // and until 2026-10-23 not a single one was in the sitemap.
    const [films, sagas] = await Promise.all([
      sitemapFilms().catch(() => []),
      listSagas(0).catch(() => []),
    ]);
    return [
      { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
      { url: `${origin}/galaxy`, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${origin}/timeline`, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${origin}/new`, changeFrequency: 'daily', priority: 0.7 },
      ...sagas.map((s) => ({
        url: `${origin}/timeline/${s.id}`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
      ...films.map((f) => ({
        url: `${origin}/${f.mediaType}/${f.tmdbId}`,
        lastModified: f.lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ];
  }
  if (host.startsWith('request.')) {
    // /requests and /verify are deliberately NOT here: both are guests' private pages and
    // are already disallowed in robots.txt.
    return [
      { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
      { url: `${origin}/browse`, changeFrequency: 'daily', priority: 0.6 },
      { url: `${origin}/trending`, changeFrequency: 'daily', priority: 0.6 },
      { url: `${origin}/library`, changeFrequency: 'daily', priority: 0.6 },
    ];
  }
  return [{ url: `${origin}/`, changeFrequency: 'monthly', priority: 1 }];
}
