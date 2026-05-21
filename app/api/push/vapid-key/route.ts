/**
 * GET /api/push/vapid-key
 *
 * Returns the VAPID public key untuk browser subscribe ke Web Push.
 * Public key safe untuk di-expose.
 */

import { NextResponse } from 'next/server';
import { getPublicKey } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = getPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
