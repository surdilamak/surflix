/**
 * GET /api/connections/galaxy
 *
 * Portal Referensi: seluruh graf koneksi APPROVED lengkap dengan posisi & kelompok
 * (layout dihitung sekali di server, lalu di-cache). Murni baca DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { galaxyGraph, sagaMembership } from '@/lib/connections';
import { layoutGalaxy } from '@/lib/galaxy-layout';

export const dynamic = 'force-dynamic';

const RELS = ['homage', 'inspired', 'visual', 'remake', 'universe', 'director', 'talent'];
const TTL = 5 * 60 * 1000;
const cache = new Map<boolean, { key: string; at: number; body: Record<string, unknown> }>();

export async function GET(req: NextRequest) {
  try {
    // Pratinjau koneksi yang menunggu review hanya untuk admin yang sedang login
    const admin = (await getSession()).isLoggedIn === true;
    const preview = admin && req.nextUrl.searchParams.get('pending') === '1';
    const extra = admin ? { canPreview: true, pendingCount: await prisma.filmConnection.count({ where: { status: 'PENDING_REVIEW' } }) } : {};

    const [{ nodes, edges }, sagas] = await Promise.all([galaxyGraph({ includePending: preview }), sagaMembership()]);
    const key = `${nodes.length}:${edges.length}:${edges.reduce((s, e) => s + e.a * 31 + e.b, 0)}`;
    const hit = cache.get(preview);
    if (hit && hit.key === key && Date.now() - hit.at < TTL) return NextResponse.json({ ...hit.body, ...extra });

    const { pos, cluster } = layoutGalaxy(nodes, edges);
    const body = {
      rels: RELS,
      preview,
      // "movie:123" -> id saga, buat tautan Watch order di panel
      sagas,
      // [tmdbId, mediaType, title, year, jellyfinId, degree, cluster, x, y]
      nodes: nodes.map((n, i) => [n.tmdbId, n.mediaType, n.title, n.year, n.jellyfinId, n.degree, cluster[i], pos[i][0], pos[i][1]]),
      // [a, b, relIndex, srcIsA, pending]
      edges: edges.map((e) => [e.a, e.b, RELS.indexOf(e.relationship), e.srcIsA ? 1 : 0, e.pending ? 1 : 0]),
    };
    cache.set(preview, { key, at: Date.now(), body });
    return NextResponse.json({ ...body, ...extra });
  } catch (err: any) {
    console.error('[GET /api/connections/galaxy]', err.message);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
