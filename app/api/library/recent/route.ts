/**
 * GET /api/library/recent?limit=60
 *
 * Judul terbaru di library (halaman "Just added" Reference). Murni baca DB. Kalau ada judul yang tanggal
 * masuknya belum terisi (kolom addedAt baru), jadwalkan satu sync di latar belakang, sekali per proses.
 */
import { NextRequest, NextResponse } from 'next/server';
import { recentTitles } from '@/lib/connections';
import { scheduleLibrarySync } from '@/lib/library-sync';

export const dynamic = 'force-dynamic';

let backfillScheduled = false;

export async function GET(req: NextRequest) {
  const limit = Math.min(120, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 60));
  try {
    const data = await recentTitles(limit);
    if (data.pendingBackfill && !backfillScheduled) {
      backfillScheduled = true;
      scheduleLibrarySync();
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/library/recent]', (err as Error).message);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
