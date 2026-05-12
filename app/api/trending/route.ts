/**
 * GET /api/trending?page=1
 *
 * Trending movies & TV mingguan dari Jellyseerr.
 * Supports pagination (page param). Per-page cache 1 jam.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';

// Per-page cache
const cache = new Map<number, { data: any; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

  const cached = cache.get(page);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const data = await jellyseerr.getTrending(page);

    const results = data.results.filter(
      (item) => item.mediaType === 'movie' || item.mediaType === 'tv'
    );

    const response = {
      results,
      page: data.page || page,
      totalPages: data.totalPages || 1,
      hasMore: (data.page || page) < (data.totalPages || 1),
      cachedAt: new Date().toISOString(),
    };

    cache.set(page, { data: response, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(response, { headers: { 'X-Cache': 'MISS' } });
  } catch (err: any) {
    console.error('[Trending API] Error:', err.message);
    return NextResponse.json({ error: 'Gagal load trending' }, { status: 500 });
  }
}
