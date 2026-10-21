/**
 * GET /api/connections?type=movie|tv&id=<tmdbId>
 *
 * Guest endpoint: koneksi APPROVED buat satu film, format graph (nodes + edges).
 * Murni baca DB — ZERO LLM. Kalau belum ada, return nodes/edges kosong.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApprovedConnections, sagaHere } from '@/lib/connections';

export const dynamic = 'force-dynamic';

const schema = z.object({
  type: z.enum(['movie', 'tv']),
  id: z.coerce.number().int().positive(),
});

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse({
    type: req.nextUrl.searchParams.get('type'),
    id: req.nextUrl.searchParams.get('id'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parameter type/id gak valid' }, { status: 400 });
  }

  try {
    const graph = await getApprovedConnections(parsed.data.id, parsed.data.type);
    // "Kamu di sini": kalau judul ini punya urutan tonton, bawa potongannya sekalian
    const source = graph.nodes[0];
    const saga = source ? await sagaHere(source.title, source.year).catch(() => null) : null;
    return NextResponse.json({ ...graph, saga });
  } catch (err: any) {
    console.error('[GET /api/connections]', err.message);
    return NextResponse.json({ error: 'Gagal ambil referensi' }, { status: 500 });
  }
}
