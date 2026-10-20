/**
 * POST /api/admin/library/sync
 *
 * Admin-only. Tarik daftar film & serial dari Jellyfin ke LibraryTitle (butuh JELLYFIN_URL + KEY).
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { syncLibraryFromJellyfin } from '@/lib/library-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, ...(await syncLibraryFromJellyfin()) });
  } catch (err: any) {
    console.error('[POST /api/admin/library/sync]', err.message);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
