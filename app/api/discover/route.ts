/**
 * GET /api/discover?type=movie&genre=28&year=2024
 *
 * Discover endpoint untuk browse by category.
 * Uses Jellyseerr discover API which proxies TMDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'movie';
  const genre = searchParams.get('genre');
  const year = searchParams.get('year'); // could be "2024" or "2024,2025"
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const params: any = { page };

    if (genre) params.genre = parseInt(genre);

    // If year has multiple values, pick first one (Jellyseerr accepts single year)
    if (year) {
      const firstYear = year.split(',')[0].trim();
      if (firstYear) params.year = parseInt(firstYear);
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
    });
  } catch (err: any) {
    console.error('[Discover API] Error:', err.message);
    return NextResponse.json({ results: [] });
  }
}
