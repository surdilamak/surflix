/**
 * GET /api/health
 *
 * Healthcheck endpoint untuk Docker.
 * Cek koneksi ke DB dan Jellyseerr.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jellyseerr } from '@/lib/jellyseerr';

export async function GET() {
  const checks = {
    db: false,
    jellyseerr: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (err) {
    console.error('[Health] DB failed:', err);
  }

  try {
    checks.jellyseerr = await jellyseerr.ping();
  } catch {}

  const healthy = checks.db; // DB wajib, Jellyseerr nice-to-have

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
