/**
 * GET /api/title-facts?type=movie|tv&id=<tmdbId>
 *
 * Synopsis, runtime, cast and scores for one title (see lib/title-facts.ts). Public, like /api/detail,
 * and cached in memory for hours so a shared link does not hit Jellyseerr or OMDb on every open.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTitleFacts } from '@/lib/title-facts';

export const dynamic = 'force-dynamic';

const schema = z.object({ type: z.enum(['movie', 'tv']), id: z.coerce.number().int().positive() });

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse({
    type: req.nextUrl.searchParams.get('type'),
    id: req.nextUrl.searchParams.get('id'),
  });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  const facts = await getTitleFacts(parsed.data.type, parsed.data.id);
  if (!facts) return NextResponse.json({ error: 'No details available' }, { status: 404 });
  return NextResponse.json(facts, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
