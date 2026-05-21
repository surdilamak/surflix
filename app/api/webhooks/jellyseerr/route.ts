/**
 * POST /api/webhooks/jellyseerr
 *
 * Webhook receiver dari Jellyseerr.
 * Setup di Jellyseerr: Settings → Notifications → Webhook
 *   URL: https://request.surdilamak.my.id/api/webhooks/jellyseerr
 *   Auth Header: Bearer <WEBHOOK_SECRET>
 *
 * Event yang kita listen:
 * - MEDIA_AVAILABLE → film udah ready di Jellyfin
 * - MEDIA_FAILED → gagal di-download
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAvailableNotification } from '@/lib/email';
import { notifyRequestFailed } from '@/lib/telegram';
import { sendPushToGuest } from '@/lib/push';
import { buildStatusChangeNotif } from '@/lib/notif-messages';

async function pushIfChanged(
  request: { guestId: string; title: string; adminNote?: string | null },
  newStatus: string,
  prevStatus: string
) {
  if (newStatus === prevStatus) return;
  const payload = buildStatusChangeNotif({
    title: request.title,
    status: newStatus,
    previousStatus: prevStatus,
    adminNote: request.adminNote ?? null,
  });
  if (!payload) return;
  try {
    await sendPushToGuest(request.guestId, payload);
  } catch (err) {
    console.warn('[Webhook] push failed:', (err as Error).message);
  }
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const authHeader = req.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.WEBHOOK_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const event = payload.notification_type;
  const media = payload.media;

  if (!event || !media) {
    return NextResponse.json({ error: 'Missing event/media' }, { status: 400 });
  }

  await prisma.eventLog.create({
    data: {
      type: `jellyseerr.${event}`,
      payload: JSON.stringify(payload),
    },
  });

  // Cari request kita berdasarkan tmdbId
  const tmdbId = parseInt(media.tmdbId);
  const mediaType = media.media_type;

  const requests = await prisma.request.findMany({
    where: {
      tmdbId,
      mediaType,
      status: { in: ['APPROVED', 'ON_SCHEDULE', 'PROCESSING', 'PARTIALLY_AVAILABLE'] },
    },
    include: { guest: true },
  });

  if (requests.length === 0) {
    return NextResponse.json({ message: 'No matching request' });
  }

  switch (event) {
    case 'MEDIA_APPROVED':
    case 'MEDIA_AUTO_APPROVED':
      // Jellyseerr approved → ON_SCHEDULE (waiting for Radarr/Sonarr to start)
      for (const r of requests) {
        if (r.status === 'APPROVED') {
          await prisma.request.update({
            where: { id: r.id },
            data: { status: 'ON_SCHEDULE' },
          });
          await pushIfChanged(r, 'ON_SCHEDULE', r.status);
        }
      }
      break;

    case 'MEDIA_PENDING':
      // Pending in Jellyseerr (before approval there) - keep our status
      break;

    case 'MEDIA_AVAILABLE':
      for (const r of requests) {
        await prisma.request.update({
          where: { id: r.id },
          data: { status: 'AVAILABLE', availableAt: new Date() },
        });
        sendAvailableNotification({
          to: r.guest.email,
          guestName: r.guest.name,
          title: r.title,
          mediaType: r.mediaType as 'movie' | 'tv',
        }).catch(console.error);
        await pushIfChanged(r, 'AVAILABLE', r.status);
      }
      break;

    case 'MEDIA_PARTIALLY_AVAILABLE':
      for (const r of requests) {
        await prisma.request.update({
          where: { id: r.id },
          data: { status: 'PARTIALLY_AVAILABLE' },
        });
        await pushIfChanged(r, 'PARTIALLY_AVAILABLE', r.status);
      }
      break;

    case 'MEDIA_FAILED':
      for (const r of requests) {
        await prisma.request.update({
          where: { id: r.id },
          data: { status: 'FAILED' },
        });
        await pushIfChanged(r, 'FAILED', r.status);
      }
      notifyRequestFailed({
        title: media.title || media.name,
        reason: payload.message || 'Unknown',
      }).catch(console.error);
      break;

    default:
      // Other events (DOWNLOAD_STARTED dll) — opportunistic upgrade to PROCESSING
      if (event.includes('DOWNLOAD') || event.includes('GRABBED')) {
        for (const r of requests) {
          if (r.status === 'ON_SCHEDULE' || r.status === 'APPROVED') {
            await prisma.request.update({
              where: { id: r.id },
              data: { status: 'PROCESSING' },
            });
            await pushIfChanged(r, 'PROCESSING', r.status);
          }
        }
      }
      break;
  }

  return NextResponse.json({ success: true, processed: requests.length });
}
