/**
 * Telegram Notification untuk Admin (Idrus)
 *
 * Dikirim kalau:
 * - Ada request baru dari guest
 * - Optional: request gagal di Jellyseerr/Radarr
 */

import TelegramBot from 'node-telegram-bot-api';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

let bot: TelegramBot | null = null;

function getBot(): TelegramBot | null {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.warn('[Telegram] Bot belum dikonfigurasi, notifikasi di-skip');
    return null;
  }
  if (!bot) {
    // polling: false karena kita cuma kirim, gak listen
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
  }
  return bot;
}

export async function notifyNewRequest(params: {
  requestId: string;
  guestName: string;
  guestEmail: string;
  title: string;
  mediaType: 'movie' | 'tv';
  year?: string;
}) {
  const b = getBot();
  if (!b) return;

  const emoji = params.mediaType === 'movie' ? '🎬' : '📺';
  const message = `
${emoji} *New Request — Surflix*

*${params.title}* ${params.year ? `(${params.year})` : ''}
Type: ${params.mediaType === 'movie' ? 'Movie' : 'TV Series'}

From: ${params.guestName} (${params.guestEmail})

[Review di Admin Panel](${APP_URL}/admin/pending)
  `.trim();

  try {
    await b.sendMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('[Telegram] Failed to send notification:', err);
  }
}

export async function notifyRequestFailed(params: {
  title: string;
  reason: string;
}) {
  const b = getBot();
  if (!b) return;

  const message = `
⚠️ *Request Failed*

*${params.title}*
Reason: ${params.reason}

Cek Jellyseerr/Radarr untuk detail.
  `.trim();

  try {
    await b.sendMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('[Telegram] Failed to send notification:', err);
  }
}
