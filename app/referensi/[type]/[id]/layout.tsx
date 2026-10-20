/**
 * Metadata per film buat halaman peta (judul tab, preview link WhatsApp/X/Slack).
 * Halaman aslinya client-side, jadi metadata-nya dipasang dari layout server ini.
 */
import type { Metadata } from 'next';
import { getFilmMeta } from '@/lib/connections';
import { posterOf } from '@/lib/portal-data';

export const dynamic = 'force-dynamic';

type Params = { type: string; id: string };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { type, id } = await params;
  if (!['movie', 'tv'].includes(type) || !/^\d+$/.test(id)) return {};

  const meta = await getFilmMeta(Number(id), type as 'movie' | 'tv').catch(() => null);
  if (!meta || !meta.title) return {};

  const label = meta.year ? `${meta.title} (${meta.year})` : meta.title;
  const n = meta.connections;
  const title = n > 0 ? `${label}: ${n} ${n === 1 ? 'connection' : 'connections'} · Surflix Reference` : `${label} · Surflix Reference`;
  const description = clip(
    meta.connections > 0
      ? `${label} connects to ${meta.connections} other ${meta.connections === 1 ? 'title' : 'titles'} on Surflix.${meta.reason ? ` ${meta.reason}` : ''}`
      : `${label} is on Surflix. Its connection map is still being drawn.`,
    200
  );

  const jellyfinUrl = process.env.NEXT_PUBLIC_JELLYFIN_URL || '';
  const image = posterOf({ poster: meta.poster, jellyfinId: meta.jellyfinId }, jellyfinUrl || undefined, 500);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Surflix Reference',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default function FilmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
