/**
 * POST /api/telegram/webhook
 *
 * Receive callback_query updates from Telegram saat lo klik tombol Approve/Reject.
 *
 * Security: Verify dengan secret token in URL query param (registered saat setWebhook).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jellyseerr } from '@/lib/jellyseerr';
import {
  answerCallbackQuery,
  updateRequestMessage,
  isConfigured,
} from '@/lib/telegram';
import { sendAvailableNotification } from '@/lib/email';
import { sendPushToGuest } from '@/lib/push';
import { buildStatusChangeNotif } from '@/lib/notif-messages';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: 'Telegram not configured' }, { status: 503 });
  }

  // Verify secret di URL query param (?secret=XXX)
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const update = await req.json();

  // Handle callback queries (button clicks)
  const callbackQuery = update.callback_query;
  if (callbackQuery) {
    return handleCallbackQuery(callbackQuery);
  }

  // Handle text messages (kalau lo kirim /start atau perintah lain)
  const message = update.message;
  if (message) {
    return handleMessage(message);
  }

  return NextResponse.json({ ok: true });
}

async function handleCallbackQuery(callbackQuery: any) {
  const callbackData = callbackQuery.data; // e.g. "approve:abc123"
  const messageId = callbackQuery.message?.message_id;
  const chatId = callbackQuery.message?.chat?.id;
  const fromUserId = callbackQuery.from?.id?.toString();

  // Security: only configured admin chat ID can interact
  if (fromUserId !== TELEGRAM_ADMIN_CHAT_ID) {
    await answerCallbackQuery(callbackQuery.id, 'Unauthorized');
    return NextResponse.json({ ok: false });
  }

  const [action, entityId] = callbackData.split(':');

  if (!entityId) {
    await answerCallbackQuery(callbackQuery.id, 'Invalid action');
    return NextResponse.json({ ok: false });
  }

  // === REMARK actions (improvement requests from guests for available/processing films) ===
  if (action === 'remark-review' || action === 'remark-resolve') {
    return handleRemarkAction(action, entityId, callbackQuery, chatId, messageId);
  }

  const requestId = entityId;
  // Lookup request
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { guest: true },
  });

  if (!request) {
    await answerCallbackQuery(callbackQuery.id, 'Request gak ketemu');
    return NextResponse.json({ ok: false });
  }

  // Already processed?
  if (request.status !== 'PENDING_ADMIN') {
    await answerCallbackQuery(
      callbackQuery.id,
      `Udah di-${request.status === 'REJECTED' ? 'reject' : 'approve'} sebelumnya`
    );
    return NextResponse.json({ ok: true });
  }

  const year = request.releaseDate?.split('-')[0];

  // === ACTION: APPROVE ===
  if (action === 'approve') {
    await answerCallbackQuery(callbackQuery.id, 'Approving...');

    try {
      // Forward ke Jellyseerr
      const jellyseerrResponse = await jellyseerr.createRequest({
        mediaType: request.mediaType as 'movie' | 'tv',
        mediaId: request.tmdbId,
      });

      // Update DB
      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: 'ON_SCHEDULE',
          approvedAt: new Date(),
          jellyseerrRequestId: jellyseerrResponse.id,
          jellyseerrMediaId: jellyseerrResponse.media?.id,
        },
      });

      await prisma.eventLog.create({
        data: {
          type: 'request.approved',
          payload: JSON.stringify({
            requestId,
            via: 'telegram',
            title: request.title,
          }),
        },
      });

      // Update message Telegram
      await updateRequestMessage({
        chatId,
        messageId,
        status: 'approved',
        title: request.title,
        year,
        mediaType: request.mediaType as 'movie' | 'tv',
        guestName: request.guest.name,
        guestNote: request.guestNote,
      });

      // Push to guest
      const approvedPayload = buildStatusChangeNotif({
        title: request.title,
        status: 'ON_SCHEDULE',
        previousStatus: 'PENDING_ADMIN',
      });
      if (approvedPayload) {
        sendPushToGuest(request.guestId, approvedPayload).catch((err) =>
          console.error('[TG Push notify failed]', err)
        );
      }
    } catch (err: any) {
      console.error('[Telegram Approve] Error:', err.message);
      await updateRequestMessage({
        chatId,
        messageId,
        status: 'error',
        title: request.title,
        year,
        mediaType: request.mediaType as 'movie' | 'tv',
        guestName: request.guest.name,
        guestNote: request.guestNote,
        errorMessage: err.message,
      });
    }
  }

  // === ACTION: REJECT ===
  else if (action === 'reject') {
    await answerCallbackQuery(callbackQuery.id, 'Rejected');

    await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        adminNote: 'Rejected via Telegram',
      },
    });

    await prisma.eventLog.create({
      data: {
        type: 'request.rejected',
        payload: JSON.stringify({
          requestId,
          via: 'telegram',
          title: request.title,
        }),
      },
    });

    await updateRequestMessage({
      chatId,
      messageId,
      status: 'rejected',
      title: request.title,
      year,
      mediaType: request.mediaType as 'movie' | 'tv',
      guestName: request.guest.name,
      guestNote: request.guestNote,
    });

    const rejectedPayload = buildStatusChangeNotif({
      title: request.title,
      status: 'REJECTED',
      previousStatus: 'PENDING_ADMIN',
      adminNote: 'Rejected via Telegram',
    });
    if (rejectedPayload) {
      sendPushToGuest(request.guestId, rejectedPayload).catch((err) =>
        console.error('[TG Push notify failed]', err)
      );
    }
  }

  // === ACTION: OPEN IN SURFLIX ===
  else if (action === 'open') {
    await answerCallbackQuery(
      callbackQuery.id,
      `Open: ${APP_URL}/admin/pending`
    );
  }

  else {
    await answerCallbackQuery(callbackQuery.id, 'Unknown action');
  }

  return NextResponse.json({ ok: true });
}

async function handleRemarkAction(
  action: string,
  remarkId: string,
  callbackQuery: any,
  chatId: number | string,
  messageId: number
) {
  const remark = await prisma.remark.findUnique({
    where: { id: remarkId },
    include: { guest: true },
  });

  if (!remark) {
    await answerCallbackQuery(callbackQuery.id, 'Remark gak ketemu');
    return NextResponse.json({ ok: false });
  }

  const newStatus = action === 'remark-resolve' ? 'RESOLVED' : 'REVIEWED';

  // Idempotent: kalau udah resolved, gak bisa "downgrade" ke reviewed
  if (remark.status === 'RESOLVED' && newStatus === 'REVIEWED') {
    await answerCallbackQuery(callbackQuery.id, 'Udah resolved sebelumnya');
    return NextResponse.json({ ok: true });
  }
  if (remark.status === newStatus) {
    await answerCallbackQuery(callbackQuery.id, `Udah di-${newStatus.toLowerCase()}`);
    return NextResponse.json({ ok: true });
  }

  await prisma.remark.update({
    where: { id: remarkId },
    data: {
      status: newStatus,
      reviewedAt: remark.reviewedAt ?? new Date(),
      resolvedAt: newStatus === 'RESOLVED' ? new Date() : undefined,
      adminNote: `${newStatus} via Telegram`,
    },
  });

  await prisma.eventLog.create({
    data: {
      type: newStatus === 'RESOLVED' ? 'remark.resolved' : 'remark.reviewed',
      payload: JSON.stringify({ remarkId, via: 'telegram', title: remark.title }),
    },
  });

  // Edit message — strip buttons, append status footer
  const typeIcon = remark.mediaType === 'movie' ? '🎬' : '📺';
  const typeLabel = remark.mediaType === 'movie' ? 'Movie' : 'TV Series';
  const statusBadge =
    newStatus === 'RESOLVED' ? '✅ <b>RESOLVED</b>' : '👁 <b>REVIEWED</b>';

  const newCaption = [
    `💬 <b>Improvement Request</b>`,
    '',
    `<b>${escapeHtmlSafe(remark.title)}</b>`,
    `${typeIcon} ${typeLabel} · ${remark.mediaStatus}`,
    `By <b>${escapeHtmlSafe(remark.guest.name)}</b>`,
    '',
    `📝 <i>${escapeHtmlSafe(remark.note)}</i>`,
    '',
    statusBadge,
  ].join('\n');

  try {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageCaption`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(chatId),
          message_id: messageId,
          caption: newCaption,
          parse_mode: 'HTML',
          reply_markup:
            newStatus === 'REVIEWED'
              ? { inline_keyboard: [[{ text: '✅ Mark Resolved', callback_data: `remark-resolve:${remarkId}` }]] }
              : { inline_keyboard: [] },
        }),
      }
    );
  } catch (err) {
    console.error('[Remark Telegram] edit failed:', err);
  }

  await answerCallbackQuery(callbackQuery.id, newStatus === 'RESOLVED' ? 'Resolved' : 'Reviewed');
  return NextResponse.json({ ok: true });
}

function escapeHtmlSafe(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function handleMessage(message: any) {
  const text = message.text?.toLowerCase() || '';
  const fromUserId = message.from?.id?.toString();

  // Only admin can interact
  if (fromUserId !== TELEGRAM_ADMIN_CHAT_ID) {
    return NextResponse.json({ ok: false });
  }

  // Handle commands
  if (text === '/start' || text === '/help') {
    // Could send help message via Telegram API
  } else if (text === '/pending') {
    // Could list pending requests
  } else if (text === '/stats') {
    // Could show quick stats
  }

  return NextResponse.json({ ok: true });
}
