/**
 * GET /api/library/index
 *
 * Reference Portal: A-Z index of the whole library + connection count per title. Pure DB read.
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
