/**
 * GET /api/search?q=...
 *
 * Proxy search ke Jellyseerr. Hasilnya include library status,
 * jadi frontend bisa langsung tau mana yang udah ada di Jellyfin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Rate limit yang lebih longgar buat search (search itu cheap)
  const limit = await checkRateLimit({
    ipAddress: ip,
    endpoint: 'search',
    max: 60, // 60 search/jam
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many searches. Coba lagi nanti.' },
      { status: 429, headers: { 'X-RateLimit-Reset': limit.resetAt.toISOString() } }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  const page = parseInt(searchParams.get('page') || '1');

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query min 2 karakter' }, { status: 400 });
  }

  try {
    const data = await jellyseerr.search(query, page);

    // Filter cuma movie & tv (no person)
    const results = data.results.filter(
      (item) => item.mediaType === 'movie' || item.mediaType === 'tv'
    );

    return NextResponse.json({
      results,
      page: data.page,
      totalPages: data.totalPages,
    });
  } catch (err: any) {
    console.error('[Search API] Error:', err.message);
    return NextResponse.json(
      { error: 'Gagal search. Coba lagi sebentar.' },
      { status: 500 }
    );
  }
}
