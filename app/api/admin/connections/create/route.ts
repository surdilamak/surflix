/**
 * POST /api/admin/connections/create
 *
 * Admin nambah koneksi manual (langsung APPROVED, source = "admin").
 * Arah: source MEREFERENSIKAN target. Kedua film harus ada di LibraryTitle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { RELATIONSHIPS } from '@/lib/connections';

export const dynamic = 'force-dynamic';

const film = z.object({ tmdbId: z.number().int().positive(), mediaType: z.enum(['movie', 'tv']) });
const schema = z.object({
  source: film,
  target: film,
  relationship: z.enum(RELATIONSHIPS),
  reasonEn: z.string().trim().min(5).max(220),
  reason: z.string().trim().max(220).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  if (body.source.tmdbId === body.target.tmdbId && body.source.mediaType === body.target.mediaType) {
    return NextResponse.json({ error: 'A film cannot reference itself' }, { status: 400 });
  }

  const [src, tgt] = await Promise.all([
    prisma.libraryTitle.findUnique({ where: { tmdbId_mediaType: { tmdbId: body.source.tmdbId, mediaType: body.source.mediaType } } }),
    prisma.libraryTitle.findUnique({ where: { tmdbId_mediaType: { tmdbId: body.target.tmdbId, mediaType: body.target.mediaType } } }),
  ]);
  if (!src || !tgt) {
    return NextResponse.json({ error: 'Both films must be in the Surflix library' }, { status: 404 });
  }

  const data = {
    sourceTmdbId: src.tmdbId, sourceMediaType: src.mediaType, sourceTitle: src.title,
    sourceYear: src.year, sourceJellyfinId: src.jellyfinId,
    targetTmdbId: tgt.tmdbId, targetMediaType: tgt.mediaType, targetTitle: tgt.title,
    targetYear: tgt.year, targetJellyfinId: tgt.jellyfinId,
    relationship: body.relationship,
    reasonEn: body.reasonEn,
    reason: body.reason || body.reasonEn, // belum ada terjemahan: pakai teks yang sama
    confidence: 'high',
    status: 'APPROVED',
    source: 'admin',
    reviewedAt: new Date(),
  };

  const connection = await prisma.filmConnection.upsert({
    where: {
      sourceTmdbId_sourceMediaType_targetTmdbId: {
        sourceTmdbId: src.tmdbId, sourceMediaType: src.mediaType, targetTmdbId: tgt.tmdbId,
      },
    },
    create: data,
    update: data, // admin menimpa draft yang ada
  });

  return NextResponse.json({ success: true, connection });
}
