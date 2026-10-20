/**
 * GET /api/library/title?type=movie|tv&id=<tmdbId>
 *
 * Satu judul dari library (dipakai halaman "belum ada peta").
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getLibraryTitle } from '@/lib/connections';

export const dynamic = 'force-dynamic';

const schema = z.object({ type: z.enum(['movie', 'tv']), id: z.coerce.number().int().positive() });

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse({
    type: req.nextUrl.searchParams.get('type'),
    id: req.nextUrl.searchParams.get('id'),
  });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  const title = await getLibraryTitle(parsed.data.id, parsed.data.type);
  if (!title) return NextResponse.json({ error: 'Not in library' }, { status: 404 });
  return NextResponse.json(title);
}
