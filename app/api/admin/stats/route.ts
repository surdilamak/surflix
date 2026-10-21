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
    where: { type: { not: 'admin.login' } }, // login admin cuma bikin riuh di daftar aktivitas
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  // Perkaya aktivitas: ambil judul dan nama tamu dari requestId di payload
  const parsed = recentEvents.map((e) => {
    let p: Record<string, any> = {};
    try {
      p = JSON.parse(e.payload);
    } catch {}
    return p;
  });
  const reqIds = [...new Set(parsed.map((p) => p.requestId).filter(Boolean))] as string[];
  const reqs = reqIds.length
    ? await prisma.request.findMany({
        where: { id: { in: reqIds } },
        select: { id: true, title: true, mediaType: true, posterPath: true, guest: { select: { name: true } } },
      })
    : [];
  const reqById = new Map(reqs.map((r) => [r.id, r]));

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
    recentEvents: recentEvents.map((e, i) => {
      const r = reqById.get(parsed[i].requestId);
      return {
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
        title: r?.title ?? parsed[i].title ?? null,
        guestName: r?.guest.name ?? parsed[i].guestName ?? parsed[i].username ?? null,
        requestId: parsed[i].requestId ?? null,
      };
    }),
  });
}
