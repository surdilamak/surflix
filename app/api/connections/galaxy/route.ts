/**
 * GET /api/connections/galaxy
 *
 * Portal Referensi: seluruh graf koneksi APPROVED lengkap dengan posisi & kelompok
 * (layout dihitung sekali di server, lalu di-cache). Murni baca DB.
 */

import { NextResponse } from 'next/server';
import { galaxyGraph } from '@/lib/connections';
import { layoutGalaxy } from '@/lib/galaxy-layout';

export const dynamic = 'force-dynamic';

const RELS = ['homage', 'inspired', 'visual', 'remake', 'universe', 'director', 'talent'];
const TTL = 5 * 60 * 1000;
let cache: { key: string; at: number; body: unknown } | null = null;

export async function GET() {
  try {
    const { nodes, edges } = await galaxyGraph();
    const key = `${nodes.length}:${edges.length}:${edges.reduce((s, e) => s + e.a * 31 + e.b, 0)}`;
    if (cache && cache.key === key && Date.now() - cache.at < TTL) return NextResponse.json(cache.body);

    const { pos, cluster } = layoutGalaxy(nodes, edges);
    const body = {
      rels: RELS,
      // [tmdbId, mediaType, title, year, jellyfinId, degree, cluster, x, y]
      nodes: nodes.map((n, i) => [n.tmdbId, n.mediaType, n.title, n.year, n.jellyfinId, n.degree, cluster[i], pos[i][0], pos[i][1]]),
      // [a, b, relIndex, srcIsA]
      edges: edges.map((e) => [e.a, e.b, RELS.indexOf(e.relationship), e.srcIsA ? 1 : 0]),
    };
    cache = { key, at: Date.now(), body };
    return NextResponse.json(body);
  } catch (err: any) {
    console.error('[GET /api/connections/galaxy]', err.message);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
