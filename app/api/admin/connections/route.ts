/**
 * Admin review queue buat FilmConnection.
 *
 * GET  /api/admin/connections?status=&sourceTmdbId=  → list (default PENDING_REVIEW)
 * POST /api/admin/connections { id, action: "approve" | "reject" } → update status
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { RELATIONSHIPS } from '@/lib/connections';

export const dynamic = 'force-dynamic';

const STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const;

const listSchema = z.object({
  status: z.enum([...STATUSES, 'ALL']).default('PENDING_REVIEW'),
  sourceTmdbId: z.coerce.number().int().positive().optional(),
  // "movie:62": semua koneksi film ini, dari dua arah
  film: z.string().regex(/^(movie|tv):\d+$/).optional(),
  confidence: z.enum(['high', 'medium']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(300),
});

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), id: z.string().cuid() }),
  z.object({ action: z.literal('reject'), id: z.string().cuid() }),
  z.object({ action: z.literal('delete'), id: z.string().cuid() }),
  z.object({
    action: z.literal('update'),
    id: z.string().cuid(),
    relationship: z.enum(RELATIONSHIPS).optional(),
    reasonEn: z.string().trim().min(5).max(220).optional(),
    reason: z.string().trim().min(5).max(220).optional(),
  }),
  // approve massal buat draft PENDING_REVIEW (opsional: filter confidence)
  z.object({ action: z.literal('bulk-approve'), confidence: z.enum(['high', 'medium']).optional() }),
]);

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const parsed = listSchema.safeParse({
    status: sp.get('status') ?? undefined,
    sourceTmdbId: sp.get('sourceTmdbId') ?? undefined,
    film: sp.get('film') ?? undefined,
    confidence: sp.get('confidence') ?? undefined,
    limit: sp.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parameter gak valid' }, { status: 400 });
  }
  const { status, sourceTmdbId, film, confidence, limit } = parsed.data;

  const [mt, id] = film ? film.split(':') : [null, null];
  const connections = await prisma.filmConnection.findMany({
    where: {
      ...(status === 'ALL' ? {} : { status }),
      ...(sourceTmdbId ? { sourceTmdbId } : {}),
      ...(confidence ? { confidence } : {}),
      ...(film
        ? {
            OR: [
              { sourceMediaType: mt!, sourceTmdbId: Number(id) },
              { targetMediaType: mt!, targetTmdbId: Number(id) },
            ],
          }
        : {}),
    },
    orderBy: [{ sourceTitle: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const grouped = await prisma.filmConnection.groupBy({ by: ['status'], _count: true });
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));

  return NextResponse.json({ connections, counts });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = actionSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  if (body.action === 'bulk-approve') {
    const res = await prisma.filmConnection.updateMany({
      where: { status: 'PENDING_REVIEW', ...(body.confidence ? { confidence: body.confidence } : {}) },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });
    return NextResponse.json({ success: true, updated: res.count });
  }

  const existing = await prisma.filmConnection.findUnique({ where: { id: body.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  if (body.action === 'delete') {
    await prisma.filmConnection.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  }

  if (body.action === 'update') {
    const connection = await prisma.filmConnection.update({
      where: { id: body.id },
      data: {
        ...(body.relationship ? { relationship: body.relationship } : {}),
        ...(body.reasonEn ? { reasonEn: body.reasonEn } : {}),
        ...(body.reason ? { reason: body.reason } : {}),
        source: 'admin', // sudah disentuh admin: seed ulang gak boleh menimpa
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, connection });
  }

  const updated = await prisma.filmConnection.update({
    where: { id: body.id },
    data: {
      status: body.action === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, connection: updated });
}
