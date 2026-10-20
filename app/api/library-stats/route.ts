/**
 * GET /api/library-stats
 *
 * Library stats. Sumber utama: snapshot library Jellyfin (LibraryTitle) — akurat dan gak
 * butuh key Jellyseerr admin. Kalau snapshot kosong: Jellyseerr /media, lalu local DB count.
 *
 * Cache 10 menit.
 */

import { NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';
import { prisma } from '@/lib/db';
import { libraryIndex } from '@/lib/connections';

let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  let moviesCount = 0;
  let seriesCount = 0;
  let mappedCount = 0;

  // Snapshot library Jellyfin (LibraryTitle): jumlah film/serial yang beneran ada
  try {
    [moviesCount, seriesCount] = await Promise.all([
      prisma.libraryTitle.count({ where: { mediaType: 'movie' } }),
      prisma.libraryTitle.count({ where: { mediaType: 'tv' } }),
    ]);
    if (moviesCount + seriesCount > 0) {
      mappedCount = (await libraryIndex()).filter((r) => r[4] > 0).length;
    }
  } catch {}

  // Try Jellyseerr next (butuh key admin, known issue #1)
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

  cache = { data: response, expiresAt: Date.now() + CACHE_TTL };

  return NextResponse.json(response);
}
