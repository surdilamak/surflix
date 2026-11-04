/**
 * GET /api/library-stats
 *
 * Library stats. Primary source: the Jellyfin library snapshot (LibraryTitle) — accurate and does not
 * need an admin Jellyseerr key. If the snapshot is empty: Jellyseerr /media, then local DB count.
 *
 * Cached for 10 minutes.
 */

import { NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';
import { prisma } from '@/lib/db';
import { libraryIndex } from '@/lib/connections';

// Must be dynamic: without this Next freezes the result at build time (empty DB) and stats get stuck at 0
export const dynamic = 'force-dynamic';

let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  let moviesCount = 0;
  let seriesCount = 0;
  let mappedCount = 0;

  // Jellyfin library snapshot (LibraryTitle): number of films/series that actually exist
  try {
    [moviesCount, seriesCount] = await Promise.all([
      prisma.libraryTitle.count({ where: { mediaType: 'movie' } }),
      prisma.libraryTitle.count({ where: { mediaType: 'tv' } }),
    ]);
    if (moviesCount + seriesCount > 0) {
      mappedCount = (await libraryIndex()).filter((r) => r[4] > 0).length;
    }
  } catch {}

  // Try Jellyseerr next (needs an admin key, known issue #1)
  if (moviesCount === 0 && seriesCount === 0) try {
    const counts = await jellyseerr.getMediaCount();
    moviesCount = counts.movies;
    seriesCount = counts.tv;
  } catch (err: any) {
    console.warn('[Library Stats] Jellyseerr failed, using local DB:', err.message);
  }

  // Fallback: count from local DB
  if (moviesCount === 0 && seriesCount === 0) {
    try {
      [moviesCount, seriesCount] = await Promise.all([
        prisma.request.count({
          where: { status: { in: ['AVAILABLE', 'PARTIALLY_AVAILABLE'] }, mediaType: 'movie' },
        }),
        prisma.request.count({
          where: { status: { in: ['AVAILABLE', 'PARTIALLY_AVAILABLE'] }, mediaType: 'tv' },
        }),
      ]);
    } catch {}
  }

  // Local DB request stats (always useful)
  let totalRequests = 0;
  let pendingRequests = 0;
  let processingRequests = 0;
  try {
    [totalRequests, pendingRequests, processingRequests] = await Promise.all([
      prisma.request.count(),
      prisma.request.count({ where: { status: 'PENDING_ADMIN' } }),
      prisma.request.count({
        where: { status: { in: ['APPROVED', 'ON_SCHEDULE', 'PROCESSING'] } },
      }),
    ]);
  } catch {}

  const response = {
    moviesCount,
    seriesCount,
    mappedCount,
    totalRequests,
    pendingRequests,
    processingRequests,
  };

  // Do not cache an empty result (e.g. a container that just started before the library snapshot was imported)
  if (moviesCount + seriesCount > 0) {
    cache = { data: response, expiresAt: Date.now() + CACHE_TTL };
  }

  return NextResponse.json(response);
}
