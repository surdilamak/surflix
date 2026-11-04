/**
 * GET /api/library/recent?limit=60
 *
 * Latest titles in the library ("Just added" page of Reference). Pure DB read. If any title's date
 * added is not filled in yet (new addedAt column), schedule one background sync, once per process.
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
