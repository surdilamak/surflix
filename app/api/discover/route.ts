/**
 * GET /api/discover?type=movie&genre=28&year=2024&network=213&page=1
 *
 * Filter combinations:
 * - type: movie | tv
 * - genre: TMDB genre ID
 * - year: release year (single)
 * - network: TMDB network ID (for TV) or studio ID (for movies)
 * - page: pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'movie';
  const genre = searchParams.get('genre');
  const year = searchParams.get('year');
  const network = searchParams.get('network');
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const params: any = { page };
    if (genre) params.genre = parseInt(genre);
    if (year) {
      const firstYear = year.split(',')[0].trim();
      if (firstYear) params.year = parseInt(firstYear);
    }
    if (network) {
      // Untuk TV: network parameter, untuk movies: studio parameter
      if (type === 'tv') {
        params.network = parseInt(network);
      } else {
        params.studio = parseInt(network);
      }
    }

    let data;
    if (type === 'tv') {
      data = await jellyseerr.discoverTv(params);
    } else {
      data = await jellyseerr.discoverMovies(params);
    }

    return NextResponse.json({
      results: data.results || [],
      page: data.page,
      totalPages: data.totalPages,
      hasMore: (data.page || 1) < (data.totalPages || 1),
    });
  } catch (err: any) {
    console.error('[Discover API] Error:', err.message);
    return NextResponse.json({ results: [] });
  }
}
