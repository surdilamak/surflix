/**
 * GET /api/og/[type]/[id]  → kartu preview 1200x630 satu film (dipakai og:image dan twitter:image).
 * Film yang tidak dikenal jatuh ke kartu umum Reference.
 */
import { NextRequest } from 'next/server';
import { getFilmOgData } from '@/lib/connections';
import { posterOf } from '@/lib/portal-data';
import { defaultCard, filmCard } from '@/lib/og';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!['movie', 'tv'].includes(type) || !/^\d+$/.test(id)) return defaultCard();

  const d = await getFilmOgData(Number(id), type as 'movie' | 'tv').catch(() => null);
  if (!d || !d.title) return defaultCard();

  const base = (process.env.JELLYFIN_URL || process.env.NEXT_PUBLIC_JELLYFIN_URL || '').replace(/\/+$/, '');
  const posterUrl = posterOf({ poster: d.poster, jellyfinId: d.jellyfinId }, base || undefined, 342);
  return filmCard({ title: d.title, year: d.year, connections: d.connections, posterUrl, related: d.related });
}
