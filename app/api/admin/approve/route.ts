/**
 * POST /api/admin/approve
 *
 * Admin approve request → forward ke Jellyseerr → status PROCESSING.
 * Jellyseerr akan auto-create di Radarr/Sonarr.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jellyseerr } from '@/lib/jellyseerr';
import { requireAdmin } from '@/lib/session';
import { sendApprovalNotification } from '@/lib/email';

const schema = z.object({
  requestId: z.string().cuid(),
  seasons: z.union([z.array(z.number()), z.literal('all')]).optional(),
  is4k: z.boolean().optional(),
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
  } catch (err) {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  // 1. Get request
  const request = await prisma.request.findUnique({
    where: { id: body.requestId },
    include: { guest: true },
  });

  if (!request) {
    return NextResponse.json({ error: 'Request gak ditemukan' }, { status: 404 });
  }

  if (request.status !== 'PENDING_ADMIN') {
    return NextResponse.json(
      { error: `Request udah dalam status ${request.status}` },
      { status: 400 }
    );
  }

  // 2. Forward ke Jellyseerr
  let jellyseerrResponse;
  try {
    jellyseerrResponse = await jellyseerr.createRequest({
      mediaType: request.mediaType as 'movie' | 'tv',
      mediaId: request.tmdbId,
      seasons: request.mediaType === 'tv' ? body.seasons || 'all' : undefined,
      is4k: body.is4k,
    });
  } catch (err: any) {
    console.error('[Approve] Jellyseerr create request failed:', err.message);
    return NextResponse.json(
      { error: 'Gagal forward ke Jellyseerr. Cek log Jellyseerr.' },
      { status: 502 }
    );
  }

  // 3. Update DB
  const updated = await prisma.request.update({
    where: { id: body.requestId },
    data: {
      status: 'PROCESSING',
      approvedAt: new Date(),
      jellyseerrRequestId: jellyseerrResponse.id,
      jellyseerrMediaId: jellyseerrResponse.media?.id,
    },
    include: { guest: true },
  });

  // 4. Event log
  await prisma.eventLog.create({
    data: {
      type: 'request.approved',
      payload: JSON.stringify({
        requestId: updated.id,
        jellyseerrRequestId: jellyseerrResponse.id,
      }),
    },
  });

  // 5. Notify guest via email (fire and forget)
  sendApprovalNotification({
    to: updated.guest.email,
    guestName: updated.guest.name,
    title: updated.title,
    mediaType: updated.mediaType as 'movie' | 'tv',
  }).catch((err) => console.error('[Email notify failed]', err));

  return NextResponse.json({ success: true, request: updated });
}
