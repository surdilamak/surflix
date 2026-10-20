/**
 * GET /api/library/index
 *
 * Portal Referensi: indeks A-Z seluruh library + jumlah koneksi per judul. Murni baca DB.
 */

import { NextResponse } from 'next/server';
import { libraryIndex } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ titles: await libraryIndex() });
  } catch (err: any) {
    console.error('[GET /api/library/index]', err.message);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
