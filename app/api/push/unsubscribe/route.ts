/**
 * POST /api/push/unsubscribe
 *
 * Remove Web Push subscription by endpoint. Idempotent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const schema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint },
  });

  return NextResponse.json({ success: true });
}
