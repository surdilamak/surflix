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

export const dynamic = 'force-dynamic';

const STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const;

const listSchema = z.object({
  status: z.enum(STATUSES).default('PENDING_REVIEW'),
  sourceTmdbId: z.coerce.number().int().positive().optional(),
});

const actionSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(['approve', 'reject']),
});

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
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parameter gak valid' }, { status: 400 });
  }

  const connections = await prisma.filmConnection.findMany({
    where: {
      status: parsed.data.status,
      ...(parsed.data.sourceTmdbId ? { sourceTmdbId: parsed.data.sourceTmdbId } : {}),
    },
    orderBy: [{ sourceTitle: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ connections });
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

  const existing = await prisma.filmConnection.findUnique({ where: { id: body.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Koneksi gak ditemukan' }, { status: 404 });
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
