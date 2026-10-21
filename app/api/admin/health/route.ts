/**
 * GET /api/admin/health
 *
 * Status integrasi buat halaman Settings: database, Jellyfin, Jellyseerr (dan apakah key-nya admin),
 * Telegram, Web Push, secret webhook, email, dan snapshot library. Admin-only; tidak pernah mengembalikan nilai rahasia.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { jellyseerr } from '@/lib/jellyseerr';
import { isConfigured as telegramConfigured } from '@/lib/telegram';
import { isPushConfigured } from '@/lib/push';

export const dynamic = 'force-dynamic';

async function timed<T>(fn: () => Promise<T>) {
  const t0 = Date.now();
  try {
    return { ok: true as const, value: await fn(), ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message, ms: Date.now() - t0 };
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jfBase = process.env.JELLYFIN_URL?.replace(/\/+$/, '');
  const [db, jf, js, admin, lib] = await Promise.all([
    timed(() => prisma.$queryRaw`SELECT 1`),
    jfBase
      ? timed(async () => {
          const r = await fetch(`${jfBase}/System/Info/Public`, { signal: AbortSignal.timeout(5000) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as { ServerName?: string; Version?: string };
        })
      : Promise.resolve(null),
    process.env.JELLYSEERR_URL ? timed(() => jellyseerr.ping().then((ok) => { if (!ok) throw new Error('No response'); })) : Promise.resolve(null),
    process.env.JELLYSEERR_URL ? jellyseerr.hasAdminKey() : Promise.resolve(false),
    Promise.all([
      prisma.libraryTitle.count(),
      prisma.libraryTitle.aggregate({ _max: { updatedAt: true } }),
    ]),
  ]);

  return NextResponse.json({
    database: { ok: db.ok, ms: db.ms },
    jellyfin: {
      configured: !!jfBase,
      hasKey: !!process.env.JELLYFIN_API_KEY,
      ok: jf?.ok ?? false,
      name: jf?.ok ? jf.value.ServerName : undefined,
      version: jf?.ok ? jf.value.Version : undefined,
      error: jf && !jf.ok ? jf.error : undefined,
      ms: jf?.ms,
    },
    jellyseerr: {
      configured: !!process.env.JELLYSEERR_URL && !!process.env.JELLYSEERR_API_KEY,
      ok: js?.ok ?? false,
      adminKey: admin,
      error: js && !js.ok ? js.error : undefined,
      ms: js?.ms,
    },
    telegram: { configured: telegramConfigured() },
    push: { configured: isPushConfigured() },
    webhookSecret: !!process.env.WEBHOOK_SECRET,
    email: { configured: !!process.env.RESEND_API_KEY },
    library: { titles: lib[0], lastSync: lib[1]._max.updatedAt },
  });
}
