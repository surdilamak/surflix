/**
 * GET /api/admin/library
 *
 * Backoffice: seluruh library + status cakupan referensi per judul
 * (approved / pending). Admin-only.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { libraryCoverage } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const titles = await libraryCoverage();
  return NextResponse.json({
    titles,
    summary: {
      total: titles.length,
      mapped: titles.filter((t) => t.approved > 0).length,
      pendingOnly: titles.filter((t) => t.approved === 0 && t.pending > 0).length,
      unmapped: titles.filter((t) => t.approved === 0 && t.pending === 0).length,
    },
  });
}
