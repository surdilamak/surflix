/**
 * GET /api/library?email=...
 *
 * Return:
 * - personal: films that this guest requested & status=AVAILABLE
 * - community: films that other guests requested & status=AVAILABLE
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.toLowerCase();

  try {
    // Query 1: Personal library (if email provided)
    let personalRequests: any[] = [];
    if (email) {
      personalRequests = await prisma.request.findMany({
        where: {
          status: 'AVAILABLE',
          guest: { email },
        },
        orderBy: { availableAt: 'desc' },
        select: {
          id: true,
          tmdbId: true,
          mediaType: true,
          title: true,
          posterPath: true,
          backdropPath: true,
          overview: true,
          releaseDate: true,
          rating: true,
          availableAt: true,
        },
      });
    }

    // Query 2: Community library (films that are already available, exclude the user's own if email is given)
    const personalTmdbIds = new Set(personalRequests.map((r) => `${r.mediaType}-${r.tmdbId}`));

    const communityRequestsRaw = await prisma.request.findMany({
      where: {
        status: 'AVAILABLE',
        ...(email ? { guest: { email: { not: email } } } : {}),
      },
      orderBy: { availableAt: 'desc' },
      select: {
        id: true,
        tmdbId: true,
        mediaType: true,
        title: true,
        posterPath: true,
        backdropPath: true,
        overview: true,
        releaseDate: true,
        rating: true,
        availableAt: true,
      },
      take: 50, // take 50, dedupe later
    });

    // Dedupe by tmdbId+mediaType (multiple guests can request the same film)
    const seen = new Set<string>();
    const communityItems = communityRequestsRaw.filter((item) => {
      const key = `${item.mediaType}-${item.tmdbId}`;
      // Skip if already in personal
      if (personalTmdbIds.has(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      personal: personalRequests,
      community: communityItems.slice(0, 30),
    });
  } catch (err: any) {
    console.error('[Library API] Error:', err.message);
    return NextResponse.json({ personal: [], community: [] });
  }
}
