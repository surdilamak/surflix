/**
 * GET /api/trending
 *
 * Trending movies & TV mingguan dari Jellyseerr.
 * Di-cache in-memory 1 jam supaya gak hit Jellyseerr terus.
 */

import { NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';

// Simple in-memory cache
let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 jam

export async function GET() {
  // Return cached jika masih fresh
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  try {
    const data = await jellyseerr.getTrending(1);

    const results = data.results.filter(
      (item) => item.mediaType === 'movie' || item.mediaType === 'tv'
    );

    const response = {
      results: results.slice(0, 20), // top 20
      cachedAt: new Date().toISOString(),
    };

    cache = {
      data: response,
      expiresAt: Date.now() + CACHE_TTL,
    };

    return NextResponse.json(response, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err: any) {
    console.error('[Trending API] Error:', err.message);
    return NextResponse.json(
      { error: 'Gagal load trending' },
      { status: 500 }
    );
  }
}
