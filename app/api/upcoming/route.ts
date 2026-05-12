/**
 * GET /api/upcoming
 *
 * TMDB upcoming movies via Jellyseerr.
 * Cached 30 menit.
 */

import { NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';

let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  try {
    const data = await jellyseerr.getUpcomingMovies(1);
    const response = { results: data.results || [] };
    cache = { data: response, expiresAt: Date.now() + CACHE_TTL };
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[Upcoming API] Error:', err.message);
    return NextResponse.json({ results: [] });
  }
}
