/**
 * GET /api/config
 *
 * Public runtime config. force-dynamic biar Next.js evaluate env setiap request.
 * (Default behavior cache di build time, yang bikin env empty.)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    jellyfinUrl: process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '',
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Surflix',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
  });
}
