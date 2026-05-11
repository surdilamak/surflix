/**
 * GET /api/library-stats
 *
 * Returns counts of movies and TV episodes available in Jellyfin.
 * Uses Jellyseerr's request count as proxy (returns processed/available requests).
 *
 * Cached 30 minutes since stats don't change frequently.
 */

import { NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';
import { prisma } from '@/lib/db';

let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  try {
    // Count from local Surflix DB (request yang udah AVAILABLE)
    const [moviesCount, seriesCount] = await Promise.all([
      prisma.request.count({
        where: { status: 'AVAILABLE', mediaType: 'movie' },
      }),
      prisma.request.count({
        where: { status: 'AVAILABLE', mediaType: 'tv' },
      }),
    ]);

    // Total active requests
    const [totalRequests, pendingRequests, processingRequests] = await Promise.all([
      prisma.request.count(),
      prisma.request.count({ where: { status: 'PENDING_ADMIN' } }),
      prisma.request.count({ where: { status: { in: ['APPROVED', 'PROCESSING'] } } }),
    ]);

    // Try to fetch total media from Jellyseerr (count all approved requests as proxy for library)
    let jellyseerrStats = null;
    try {
      const requestData = await jellyseerr.getRequests({ take: 1, filter: 'available' });
      // pageInfo.results = total count
      jellyseerrStats = {
        totalAvailable: requestData?.pageInfo?.results || 0,
      };
    } catch {
      // Jellyseerr might not have this exposed
    }

    const response = {
      moviesCount,
      seriesCount,
      totalRequests,
      pendingRequests,
      processingRequests,
      jellyseerr: jellyseerrStats,
    };

    cache = { data: response, expiresAt: Date.now() + CACHE_TTL };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[Library Stats] Error:', err.message);
    return NextResponse.json({
      moviesCount: 0,
      seriesCount: 0,
      totalRequests: 0,
      pendingRequests: 0,
      processingRequests: 0,
    });
  }
}
