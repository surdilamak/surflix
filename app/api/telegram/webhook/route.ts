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

  const [action, requestId] = callbackData.split(':');

  if (!requestId) {
    await answerCallbackQuery(callbackQuery.id, 'Invalid action');
    return NextResponse.json({ ok: false });
  }

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
