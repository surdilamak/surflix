/**
 * GET /api/library/search?q=
 *
 * Reference Portal: search films/series in the Surflix library (title, original title, director).
 * Each result carries refCount (0 = no map yet). Pure DB read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchLibrary } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  try {
    const results = await searchLibrary(q, 12);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('[GET /api/library/search]', err.message);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
