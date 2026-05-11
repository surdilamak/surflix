/**
 * GET /api/requests/me
 *
 * Get list request untuk guest yang lagi login (via JWT session token).
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

  let payload;
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as { guestId: string; email: string; name: string };
  } catch {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const requests = await prisma.request.findMany({
    where: { guestId: payload.guestId },
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
  });

  return NextResponse.json({
    guest: { name: payload.name, email: payload.email },
    requests,
  });
}
