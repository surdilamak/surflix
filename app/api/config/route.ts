/**
 * GET /api/config
 *
 * Public runtime config. force-dynamic so Next.js evaluates env on every request.
 * (Default behavior caches at build time, which leaves env empty.)
 */

import { NextResponse } from 'next/server';
import { getServerId } from '@/lib/jellyfin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    jellyfinUrl: process.env.NEXT_PUBLIC_JELLYFIN_URL || process.env.JELLYFIN_URL || '',
    jellyfinServerId: await getServerId(),
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Surflix',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
  });
}
