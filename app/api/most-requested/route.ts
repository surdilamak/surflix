/**
 * GET /api/most-requested
 *
 * Return: aggregate request count per film/series.
 * Status: APPROVED, PROCESSING, AVAILABLE (semua yang pernah di-approve).
 * Min 2 requests buat masuk list.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// In-memory cache, 10 menit
let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  try {
    // Aggregate request counts by tmdbId + mediaType
    const grouped = await prisma.request.groupBy({
      by: ['tmdbId', 'mediaType'],
      where: {
        status: { in: ['APPROVED', 'PROCESSING', 'AVAILABLE', 'PARTIALLY_AVAILABLE'] },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    // Filter min 2 requests
    const qualified = grouped.filter((g) => g._count.id >= 2);

    // Fetch metadata buat tiap item (ambil dari request pertama yang match)
    const results = await Promise.all(
      qualified.map(async (g) => {
        const req = await prisma.request.findFirst({
          where: { tmdbId: g.tmdbId, mediaType: g.mediaType },
          orderBy: { requestedAt: 'desc' },
          select: {
            tmdbId: true,
            mediaType: true,
            title: true,
            posterPath: true,
            backdropPath: true,
            overview: true,
            releaseDate: true,
            rating: true,
          },
        });
        if (!req) return null;

        return {
          id: req.tmdbId,
          mediaType: req.mediaType,
          title: req.mediaType === 'movie' ? req.title : undefined,
          name: req.mediaType === 'tv' ? req.title : undefined,
          overview: req.overview,
          posterPath: req.posterPath,
          backdropPath: req.backdropPath,
          releaseDate: req.mediaType === 'movie' ? req.releaseDate : undefined,
          firstAirDate: req.mediaType === 'tv' ? req.releaseDate : undefined,
          voteAverage: req.rating,
          requestCount: g._count.id,
        };
      })
    );

    const filtered = results.filter((r) => r !== null);

    const response = { results: filtered };
    cache = { data: response, expiresAt: Date.now() + CACHE_TTL };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[Most Requested API] Error:', err.message);
    return NextResponse.json({ results: [] });
  }
}
