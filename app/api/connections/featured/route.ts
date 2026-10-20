/**
 * GET /api/connections/featured
 *
 * Segelintir film dengan referensi paling kaya (cuma yang punya gambar Jellyfin),
 * buat cincin poster di landing. Ringan (beda dengan /films yang bawa seluruh graf).
 * Hasil di-cache di memori 10 menit.
 */

import { NextResponse } from 'next/server';
import { listConnectedFilms } from '@/lib/connections';

export const dynamic = 'force-dynamic';

const LIMIT = 24;
const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; films: unknown[] } | null = null;

export async function GET() {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const all = await listConnectedFilms();
    const films = all
      .filter((f) => f.jellyfinId && f.refScore > 0)
      .slice(0, LIMIT)
      .map((f) => ({
        tmdbId: f.tmdbId,
        mediaType: f.mediaType,
        title: f.title,
        year: f.year,
        jellyfinId: f.jellyfinId,
        count: f.count,
      }));
    cache = { at: Date.now(), films };
  }
  return NextResponse.json({ films: cache.films });
}
