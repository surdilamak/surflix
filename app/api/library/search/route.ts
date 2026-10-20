/**
 * GET /api/library/search?q=
 *
 * Portal Referensi: cari film/serial di library Surflix (judul, judul asli, sutradara).
 * Tiap hasil bawa refCount (0 = belum ada peta). Murni baca DB.
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
