/**
 * GET /api/remarks/by-guest?id=<guestId>
 *
 * Get list remarks (improvement requests) by guestId from cookie/localStorage.
 * Sama pattern dengan /api/requests/by-guest — guestId itself is the proof.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveCanonicalGuestId } from '@/lib/guest';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
  }

  try {
    const canonicalId = await resolveCanonicalGuestId(id);
    if (!canonicalId) {
      return NextResponse.json({ remarks: [], guest: null });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: canonicalId },
      include: {
        remarks: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            mediaType: true,
            posterPath: true,
            mediaStatus: true,
            note: true,
            status: true,
            adminNote: true,
            createdAt: true,
            reviewedAt: true,
            resolvedAt: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ remarks: [], guest: null });
    }

    return NextResponse.json({
      guest: { name: guest.name },
      remarks: guest.remarks,
    });
  } catch (err: any) {
    console.error('[Remarks by Guest] Error:', err.message);
    return NextResponse.json({ remarks: [] });
  }
}
