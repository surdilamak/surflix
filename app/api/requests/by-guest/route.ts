/**
 * GET /api/requests/by-guest?id=<guestId>
 *
 * Get list request by guestId (from cookie/localStorage).
 * No auth — guestId itself is the proof of ownership.
 *
 * Rationale: guestId di-generate server-side, returned ke client pas first request,
 * client save di localStorage. Cuma client yang punya ID itu yang bisa lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
  }

  try {
    const guest = await prisma.guest.findUnique({
      where: { id },
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
      guest: { name: guest.name },
      requests: guest.requests,
    });
  } catch (err: any) {
    console.error('[Requests by Guest] Error:', err.message);
    return NextResponse.json({ requests: [] });
  }
}
