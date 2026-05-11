/**
 * GET /api/admin/requests
 *
 * Get list of requests untuk admin panel.
 * Query params:
 * - status: filter by status (default: PENDING_ADMIN)
 * - limit: max results (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'PENDING_ADMIN';
  const limit = parseInt(searchParams.get('limit') || '50');

  const requests = await prisma.request.findMany({
    where: status === 'ALL' ? {} : { status },
    orderBy: { requestedAt: 'desc' },
    take: limit,
    include: {
      guest: {
        select: { name: true, email: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ requests });
}
