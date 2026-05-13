/**
 * Telegram Bot Integration — pure HTTP (no library needed)
 *
 * Capabilities:
 * - Send notification with poster + caption to admin
 * - Inline buttons: Approve / Reject
 * - Webhook callbacks (handled di /api/telegram/webhook)
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const API_BASE = 'https://api.telegram.org';

function tgUrl(method: string) {
  return `${API_BASE}/bot${TELEGRAM_BOT_TOKEN}/${method}`;
}

function isConfigured() {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_CHAT_ID);
}

interface InlineButton {
  text: string;
  callback_data: string;
}

async function tgCall(method: string, params: any) {
  if (!isConfigured()) {
    console.warn('[Telegram] not configured, skipping');
    return null;
  }
  try {
    const res = await fetch(tgUrl(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`[Telegram] ${method} failed:`, data.description);
    }
    return data;
  } catch (err: any) {
    console.error(`[Telegram] ${method} error:`, err.message);
    return null;
  }
}

function tmdbImage(path: string | null | undefined, size = 'w500'): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

/**
 * Send photo dengan caption HTML
 */
async function sendPhoto(params: {
  chatId: string;
  photoUrl: string;
  caption: string;
  buttons?: InlineButton[][];
}) {
  return tgCall('sendPhoto', {
    chat_id: params.chatId,
    photo: params.photoUrl,
    caption: params.caption,
    parse_mode: 'HTML',
    reply_markup: params.buttons ? { inline_keyboard: params.buttons } : undefined,
  });
}

/**
 * Send text message (HTML formatted)
 */
async function sendMessage(params: {
  chatId: string;
  text: string;
  buttons?: InlineButton[][];
  replyToMessageId?: number;
}) {
  return tgCall('sendMessage', {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: 'HTML',
    reply_to_message_id: params.replyToMessageId,
    reply_markup: params.buttons ? { inline_keyboard: params.buttons } : undefined,
  });
}

/**
 * Edit a sent message (used after approve/reject to update buttons)
 */
async function editMessageCaption(params: {
  chatId: string;
  messageId: number;
  caption: string;
  buttons?: InlineButton[][];
}) {
  return tgCall('editMessageCaption', {
    chat_id: params.chatId,
    message_id: params.messageId,
    caption: params.caption,
    parse_mode: 'HTML',
    reply_markup: params.buttons ? { inline_keyboard: params.buttons } : undefined,
  });
}

/**
 * Answer callback query (acknowledge inline button click)
 */
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return tgCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Notify admin tentang request baru
 * Format: poster + caption + buttons | follow-up reply dengan info detail kalau ada note
 */
export async function notifyNewRequest(params: {
  requestId: string;
  guestName: string;
  guestEmail?: string;
  title: string;
  mediaType: 'movie' | 'tv';
  year?: string;
  posterPath?: string | null;
  overview?: string | null;
  guestNote?: string | null;
}) {
  if (!isConfigured()) return;

  const typeLabel = params.mediaType === 'movie' ? 'Movie' : 'TV Series';
  const typeIcon = params.mediaType === 'movie' ? '🎬' : '📺';

  // Main caption (concise)
  const caption = [
    `${typeIcon} <b>New Request</b>`,
    '',
    `<b>${escapeHtml(params.title)}</b>${params.year ? ` (${params.year})` : ''}`,
    `${typeLabel} · Requested by <b>${escapeHtml(params.guestName)}</b>`,
    params.guestNote ? `\n📝 <i>${escapeHtml(params.guestNote)}</i>` : '',
  ].filter(Boolean).join('\n');

  const buttons: InlineButton[][] = [
    [
      { text: '✅ Approve', callback_data: `approve:${params.requestId}` },
      { text: '❌ Reject', callback_data: `reject:${params.requestId}` },
    ],
    [
      { text: '🔗 Open in Surflix', callback_data: `open:${params.requestId}` },
    ],
  ];

  const poster = tmdbImage(params.posterPath, 'w500');

  let response;
  if (poster) {
    response = await sendPhoto({
      chatId: TELEGRAM_ADMIN_CHAT_ID,
      photoUrl: poster,
      caption,
      buttons,
    });
  } else {
    response = await sendMessage({
      chatId: TELEGRAM_ADMIN_CHAT_ID,
      text: caption,
      buttons,
    });
  }

  // Reply dengan overview kalau ada (biar nampak detail tanpa cluttering main message)
  const messageId = response?.result?.message_id;
  if (messageId && params.overview) {
    await sendMessage({
      chatId: TELEGRAM_ADMIN_CHAT_ID,
      text: `<b>Synopsis:</b>\n${escapeHtml(params.overview)}`,
      replyToMessageId: messageId,
    });
  }
}

/**
 * Notify admin kalau ada request yang gagal di Jellyseerr
 */
export async function notifyRequestFailed(params: {
  title: string;
  reason: string;
}) {
  if (!isConfigured()) return;
  await sendMessage({
    chatId: TELEGRAM_ADMIN_CHAT_ID,
    text: `⚠️ <b>Request Failed</b>\n\n<b>${escapeHtml(params.title)}</b>\nReason: ${escapeHtml(params.reason)}`,
  });
}

/**
 * Update message setelah approve/reject (untuk menghilangkan tombol & update status)
 */
export async function updateRequestMessage(params: {
  chatId: number | string;
  messageId: number;
  status: 'approved' | 'rejected' | 'error';
  title: string;
  year?: string;
  mediaType: 'movie' | 'tv';
  guestName: string;
  guestNote?: string | null;
  errorMessage?: string;
}) {
  const typeIcon = params.mediaType === 'movie' ? '🎬' : '📺';
  const typeLabel = params.mediaType === 'movie' ? 'Movie' : 'TV Series';

  let statusBadge = '';
  if (params.status === 'approved') statusBadge = '✅ <b>APPROVED & sent to Jellyseerr</b>';
  else if (params.status === 'rejected') statusBadge = '❌ <b>REJECTED</b>';
  else if (params.status === 'error') statusBadge = `⚠️ <b>ERROR: ${escapeHtml(params.errorMessage || 'Unknown')}</b>`;

  const caption = [
    `${typeIcon} <b>${escapeHtml(params.title)}</b>${params.year ? ` (${params.year})` : ''}`,
    `${typeLabel} · by <b>${escapeHtml(params.guestName)}</b>`,
    params.guestNote ? `\n📝 <i>${escapeHtml(params.guestNote)}</i>` : '',
    '',
    statusBadge,
  ].filter(Boolean).join('\n');

  await editMessageCaption({
    chatId: String(params.chatId),
    messageId: params.messageId,
    caption,
    buttons: [], // no more buttons
  });
}

/**
 * Setup webhook (one-time call to register Surflix URL with Telegram)
 */
export async function setWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
  if (!isConfigured()) {
    return { ok: false, description: 'Bot not configured' };
  }
  const res = await fetch(tgUrl('setWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      allowed_updates: ['callback_query', 'message'],
    }),
  });
  const data = await res.json();
  return data;
}

/**
 * Get webhook info (for debug)
 */
export async function getWebhookInfo(): Promise<any> {
  if (!isConfigured()) return null;
  const res = await fetch(tgUrl('getWebhookInfo'));
  return res.json();
}

export {
  answerCallbackQuery,
  isConfigured,
};
