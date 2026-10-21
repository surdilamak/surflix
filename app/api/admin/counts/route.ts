/**
 * GET /api/admin/counts
 *
 * Angka ringan buat lencana di navigasi admin: request menunggu, koneksi menunggu review, unduhan berjalan.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [pendingRequests, reviewQueue, downloading] = await Promise.all([
    prisma.request.count({ where: { status: 'PENDING_ADMIN' } }),
    prisma.filmConnection.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.request.count({ where: { status: { in: ['PROCESSING', 'ON_SCHEDULE', 'APPROVED'] } } }),
  ]);
  return NextResponse.json({ pendingRequests, reviewQueue, downloading });
}
