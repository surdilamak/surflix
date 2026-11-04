/**
 * GET /api/requests/by-guest?id=<guestId>
 *
 * Get list of requests by guestId (from cookie/localStorage).
 * No auth — guestId itself is the proof of ownership.
 *
 * Rationale: guestId is generated server-side, returned to the client on the first request,
 * client saves it in localStorage. Only a client that has that ID can look it up.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveCanonicalGuestId, touchGuestLang } from '@/lib/guest';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
  }

  try {
    const canonicalId = await resolveCanonicalGuestId(id);
    if (!canonicalId) {
      return NextResponse.json({ requests: [], guest: null });
    }

    await touchGuestLang(canonicalId, req.cookies.get('surflix_lang')?.value);

    const guest = await prisma.guest.findUnique({
      where: { id: canonicalId },
      include: {
        requests: {
          orderBy: { requestedAt: 'desc' },
          select: {
            id: true,
            title: true,
            mediaType: true,
            posterPath: true,
            status: true,
            requestedAt: true,
            approvedAt: true,
            availableAt: true,
            adminNote: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ requests: [], guest: null });
    }

    return NextResponse.json({
      guest: { name: guest.name, canonicalId: guest.id },
      requests: guest.requests,
    });
  } catch (err: any) {
    console.error('[Requests by Guest] Error:', err.message);
    return NextResponse.json({ requests: [] });
  }
}
