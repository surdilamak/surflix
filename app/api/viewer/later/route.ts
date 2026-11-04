/**
 * POST /api/viewer/later  { mediaType: 'movie'|'tv', tmdbId: number, save: boolean }
 *
 * Saves a library title to (or removes it from) the signed-in viewer's "Watch later" playlist in
 * Jellyfin, so it also shows up in the Jellyfin apps. Idempotent: saving twice adds it once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  addToWatchLater,
  findJellyfinId,
  getWatchLater,
  libraryKey,
  removeFromWatchLater,
} from '@/lib/jellyfin';
import { getViewer } from '@/lib/viewer-session';

export const dynamic = 'force-dynamic';

const schema = z.object({
  mediaType: z.enum(['movie', 'tv']),
  tmdbId: z.number().int().positive(),
  save: z.boolean(),
});
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function POST(req: NextRequest) {
  const session = await getViewer();
  if (!session) return NextResponse.json({ error: 'signin' }, { status: 401, headers: NO_STORE });

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400, headers: NO_STORE });
  }

  try {
    const key = libraryKey(body.mediaType, body.tmdbId);
    const state = await getWatchLater(session.userId);
    const saved = state.entries.get(key);

    if (body.save && !saved) {
      const jellyfinId = await findJellyfinId(body.mediaType, body.tmdbId);
      if (!jellyfinId) return NextResponse.json({ error: 'not-in-library' }, { status: 404, headers: NO_STORE });
      await addToWatchLater(session.userId, jellyfinId, state);
    } else if (!body.save && saved && state.playlistId) {
      await removeFromWatchLater(state.playlistId, saved);
    }
    return NextResponse.json({ ok: true, saved: body.save }, { headers: NO_STORE });
  } catch (err) {
    console.error('[viewer] watch-later failed:', err);
    return NextResponse.json({ error: 'unavailable' }, { status: 502, headers: NO_STORE });
  }
}
