/**
 * GET /api/admin/stats
 *
 * Dashboard stats untuk admin panel:
 * - Total requests, by status
 * - Movies/series count
 * - Top requesters
 * - Recent activity
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parallel queries
  const [
    totalRequests,
    pendingCount,
    approvedCount,
    processingCount,
    availableCount,
    rejectedCount,
    moviesCount,
    seriesCount,
    totalGuests,
    topRequestersRaw,
  ] = await Promise.all([
    prisma.request.count(),
    prisma.request.count({ where: { status: 'PENDING_ADMIN' } }),
    prisma.request.count({ where: { status: 'APPROVED' } }),
    prisma.request.count({ where: { status: 'PROCESSING' } }),
    prisma.request.count({ where: { status: 'AVAILABLE' } }),
    prisma.request.count({ where: { status: 'REJECTED' } }),
    prisma.request.count({ where: { mediaType: 'movie', status: 'AVAILABLE' } }),
    prisma.request.count({ where: { mediaType: 'tv', status: 'AVAILABLE' } }),
    prisma.guest.count(),
    prisma.request.groupBy({
      by: ['guestId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  // Resolve guest names for top requesters
  const topRequesters = await Promise.all(
    topRequestersRaw.map(async (g) => {
      const guest = await prisma.guest.findUnique({
        where: { id: g.guestId },
        select: { name: true, email: true, createdAt: true },
      });
      return {
        name: guest?.name || 'Unknown',
        email: guest?.email || '',
        requestCount: g._count.id,
        memberSince: guest?.createdAt,
      };
    })
  );

  // Recent activity (last 10 events)
  const recentEvents = await prisma.eventLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    summary: {
      totalRequests,
      pendingCount,
      approvedCount,
      processingCount,
      availableCount,
      rejectedCount,
      moviesCount,
      seriesCount,
      totalGuests,
    },
    topRequesters,
    recentEvents: recentEvents.map((e) => ({
      type: e.type,
      payload: e.payload,
      createdAt: e.createdAt,
    })),
  });
}
