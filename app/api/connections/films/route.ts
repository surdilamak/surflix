/**
 * GET /api/connections/films
 *
 * Portal Referensi: daftar film yang punya peta referensi APPROVED.
 * Murni baca DB — ZERO LLM.
 */

import { NextResponse } from 'next/server';
import { listConnectedFilms } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const films = await listConnectedFilms();
    return NextResponse.json({ films });
  } catch (err: any) {
    console.error('[GET /api/connections/films]', err.message);
    return NextResponse.json({ error: 'Gagal ambil daftar film' }, { status: 500 });
  }
}
