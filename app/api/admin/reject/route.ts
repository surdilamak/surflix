/**
 * POST /api/admin/reject
 *
 * Admin reject request → status REJECTED → notify guest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { sendRejectionNotification } from '@/lib/email';
import { sendPushToGuest } from '@/lib/push';
import { buildStatusChangeNotif } from '@/lib/notif-messages';

const schema = z.object({
  requestId: z.string().cuid(),
  reason: z.string().max(500).optional(),
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
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  const request = await prisma.request.findUnique({
    where: { id: body.requestId },
    include: { guest: true },
  });

  if (!request) {
    return NextResponse.json({ error: 'Request gak ditemukan' }, { status: 404 });
  }

  const updated = await prisma.request.update({
    where: { id: body.requestId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      adminNote: body.reason,
    },
    include: { guest: true },
  });

  await prisma.eventLog.create({
    data: {
      type: 'request.rejected',
      payload: JSON.stringify({ requestId: updated.id, reason: body.reason }),
    },
  });

  // Notify guest
  sendRejectionNotification({
    to: updated.guest.email,
    guestName: updated.guest.name,
    title: updated.title,
    reason: body.reason,
  }).catch((err) => console.error('[Email notify failed]', err));

  const pushPayload = buildStatusChangeNotif({
    title: updated.title,
    status: 'REJECTED',
    previousStatus: 'PENDING_ADMIN',
    adminNote: body.reason ?? null,
  });
  if (pushPayload) {
    sendPushToGuest(updated.guestId, pushPayload).catch((err) =>
      console.error('[Push notify failed]', err)
    );
  }

  return NextResponse.json({ success: true, request: updated });
}
