/**
 * GET /api/config
 *
 * Public config yang client bisa fetch saat runtime.
 * Solusi buat Next.js standalone mode yang sometimes strip NEXT_PUBLIC_* vars.
 *
 * Cache aman karena values jarang berubah.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    jellyfinUrl: process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '',
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Surflix',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
  });
}
