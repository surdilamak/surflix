/**
 * GET /api/connections?type=movie|tv&id=<tmdbId>
 *
 * Guest endpoint: APPROVED connections for one film, in graph format (nodes + edges).
 * Pure DB read — ZERO LLM. If there are none yet, return empty nodes/edges.
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
    // "Kamu di sini": if this title has a watch order, include its excerpt too
    const source = graph.nodes[0];
    const saga = source ? await sagaHere(source.title, source.year).catch(() => null) : null;
    return NextResponse.json({ ...graph, saga });
  } catch (err: any) {
    console.error('[GET /api/connections]', err.message);
    return NextResponse.json({ error: 'Gagal ambil referensi' }, { status: 500 });
  }
}
