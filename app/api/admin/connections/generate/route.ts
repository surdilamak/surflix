/**
 * POST /api/admin/connections/generate
 *
 * Admin-only. Body: { tmdbId, mediaType }.
 * Jalanin pipeline LLM -> TMDB -> filter library Jellyfin, simpan PENDING_REVIEW.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/session';
import { generateConnections } from '@/lib/connections';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const schema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  try {
    const summary = await generateConnections(body.tmdbId, body.mediaType);
    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.error('[POST /api/admin/connections/generate]', err.message);
    return NextResponse.json({ error: err.message || 'Gagal generate' }, { status: 500 });
  }
}
