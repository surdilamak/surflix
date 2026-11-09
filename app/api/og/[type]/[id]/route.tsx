/**
 * GET /api/og/[type]/[id]  → preview card 1200x630 for one film (used as og:image and twitter:image).
 * Unknown films fall back to the generic Reference card.
 */
import { NextRequest } from 'next/server';
import { getFilmOgData } from '@/lib/connections';
import { posterOf } from '@/lib/portal-data';
import { defaultCard, filmCard } from '@/lib/og';
import { getTitleFacts, scoreLine } from '@/lib/title-facts';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!['movie', 'tv'].includes(type) || !/^\d+$/.test(id)) return defaultCard();

  const d = await getFilmOgData(Number(id), type as 'movie' | 'tv').catch(() => null);
  if (!d || !d.title) return defaultCard();

  const base = (process.env.JELLYFIN_URL || process.env.NEXT_PUBLIC_JELLYFIN_URL || '').replace(/\/+$/, '');
  const posterUrl = posterOf({ poster: d.poster, jellyfinId: d.jellyfinId }, base || undefined, 342);
  // a title without a map shows its scores and synopsis instead of an empty card
  const facts = d.connections === 0 ? await getTitleFacts(type as 'movie' | 'tv', Number(id)).catch(() => null) : null;
  return filmCard({
    title: d.title,
    year: d.year,
    connections: d.connections,
    posterUrl,
    related: d.related,
    scores: facts ? scoreLine(facts.scores, true) : undefined,
    synopsis: facts?.overview ?? undefined,
  });
}
