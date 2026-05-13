/**
 * POST /api/telegram/setup
 *
 * One-time setup: register Surflix webhook URL with Telegram.
 * Admin only.
 *
 * GET /api/telegram/setup → return webhook info (debug)
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { setWebhook, getWebhookInfo, isConfigured } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'TELEGRAM_BOT_TOKEN dan TELEGRAM_ADMIN_CHAT_ID belum di-set di .env',
    });
  }

  const info = await getWebhookInfo();
  return NextResponse.json({
    configured: true,
    webhookInfo: info?.result,
    expectedUrl: `${APP_URL}/api/telegram/webhook?secret=***`,
  });
}

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Telegram bot belum dikonfigurasi. Set TELEGRAM_BOT_TOKEN dan TELEGRAM_ADMIN_CHAT_ID di .env.',
      },
      { status: 400 }
    );
  }

  if (!APP_URL || !APP_URL.startsWith('https://')) {
    return NextResponse.json(
      {
        success: false,
        error: `APP_URL must be HTTPS. Current: ${APP_URL}`,
      },
      { status: 400 }
    );
  }

  const webhookUrl = `${APP_URL}/api/telegram/webhook${WEBHOOK_SECRET ? `?secret=${WEBHOOK_SECRET}` : ''}`;

  const result = await setWebhook(webhookUrl);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.description },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    webhookUrl: webhookUrl.replace(WEBHOOK_SECRET, '***'),
    message: 'Webhook registered. Telegram akan kirim updates ke endpoint ini.',
  });
}
