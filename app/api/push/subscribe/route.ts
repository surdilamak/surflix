/**
 * POST /api/push/subscribe
 *
 * Save Web Push subscription untuk guestId (follow alias chain ke canonical).
 * Idempotent — kalau endpoint udah ada, update guestId + lastUsed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { resolveCanonicalGuestId } from '@/lib/guest';

const schema = z.object({
  guestId: z.string().min(1),
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  const canonicalId = await resolveCanonicalGuestId(body.guestId);
  if (!canonicalId) {
    return NextResponse.json({ error: 'Guest gak ditemukan' }, { status: 404 });
  }

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      guestId: canonicalId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent,
    },
    update: {
      guestId: canonicalId,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent,
      lastUsed: new Date(),
    },
  });

  return NextResponse.json({ success: true, id: sub.id });
}
