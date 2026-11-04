/**
 * GET /api/push/vapid-key
 *
 * Returns the VAPID public key for the browser to subscribe to Web Push.
 * Public key is safe to expose.
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
