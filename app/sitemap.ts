/**
 * sitemap.xml sadar-host: tiap situs Surflix menerima sitemap-nya sendiri dari satu route.
 *  - reference.*: beranda, Galaxy, Watch order, Just added, SETIAP halaman saga, dan
 *    setiap peta film yang punya koneksi
 *  - apex / www: landing
 *  - request.*: semua halaman publik (beranda, browse, trending, library)
 * (Path berakhiran .xml tidak lewat middleware, jadi host dibaca langsung di sini.)
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
    // listSagas() adalah daftar yang sama persis dengan yang dirender indeks /timeline,
    // jadi sitemap dan indeks tidak bisa menyimpang. Halaman saga memuat kurasi tangan
    // (nama, tip, jalur, urutan cerita, catatan per judul) - isi terkaya di portal ini,
    // dan sampai 2026-10-23 satu pun tidak ada di sitemap.
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
    // /requests dan /verify sengaja TIDAK di sini: keduanya halaman pribadi tamu dan
    // sudah di-disallow di robots.txt.
    return [
      { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
      { url: `${origin}/browse`, changeFrequency: 'daily', priority: 0.6 },
      { url: `${origin}/trending`, changeFrequency: 'daily', priority: 0.6 },
      { url: `${origin}/library`, changeFrequency: 'daily', priority: 0.6 },
    ];
  }
  return [{ url: `${origin}/`, changeFrequency: 'monthly', priority: 1 }];
}
