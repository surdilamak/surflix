/**
 * GET /api/library
 *
 * Get list media yang udah available di Jellyfin (status=5)
 * via Jellyseerr's /media endpoint.
 */

import { NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';

let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 menit

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }

  try {
    // Jellyseerr endpoint /media?filter=available
    // Tapi /media gak return TMDB metadata lengkap, jadi kita kombinasiin
    // dengan trending + filter status=5
    const trending = await jellyseerr.getTrending(1);
    const available = trending.results.filter(
      (item) => item.mediaInfo?.status === 5 || item.mediaInfo?.status === 4
    );

    const response = { results: available };
    cache = { data: response, expiresAt: Date.now() + CACHE_TTL };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[Library API] Error:', err.message);
    return NextResponse.json({ results: [] });
  }
}
