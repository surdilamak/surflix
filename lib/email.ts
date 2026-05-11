/**
 * Email Service via Resend
 *
 * Dipakai untuk:
 * 1. Magic link login guest
 * 2. Notif "Request Available" pas film udah ready di Jellyfin
 * 3. Notif "Request Approved" / "Rejected"
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Surflix <noreply@surdilamak.my.id>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const JELLYFIN_URL = process.env.NEXT_PUBLIC_JELLYFIN_URL!;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function ensureResend() {
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY belum di-set, email gak akan terkirim');
    return null;
  }
  return resend;
}

/**
 * Magic link untuk akses My Requests page tanpa password
 */
export async function sendMagicLink(params: {
  to: string;
  guestName: string;
  token: string;
}) {
  const r = ensureResend();
  if (!r) return;

  const link = `${APP_URL}/verify?token=${params.token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif; background: #000; color: #fff; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #1c1c1e; border-radius: 18px; padding: 32px; border: 0.5px solid rgba(255,255,255,0.1);">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
      <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #ff375f, #ff9500); border-radius: 8px;"></div>
      <span style="font-size: 18px; font-weight: 600; letter-spacing: -0.02em;">Surflix</span>
    </div>
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px; letter-spacing: -0.02em;">Hi ${params.guestName} 👋</h1>
    <p style="font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; margin: 0 0 24px;">
      Klik link di bawah untuk akses halaman request lo. Link akan aktif selama 30 menit.
    </p>
    <a href="${link}" style="display: inline-block; background: #fff; color: #000; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Buka Surflix →
    </a>
    <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 32px 0 0; line-height: 1.5;">
      Kalau lo gak request link ini, abaikan aja email ini.
    </p>
  </div>
</body>
</html>
  `.trim();

  await r.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: '🎬 Login link buat Surflix',
    html,
  });
}

/**
 * Notif "Approved" — request lo di-terima admin, lagi di-download
 */
export async function sendApprovalNotification(params: {
  to: string;
  guestName: string;
  title: string;
  mediaType: 'movie' | 'tv';
}) {
  const r = ensureResend();
  if (!r) return;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif; background: #000; color: #fff; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #1c1c1e; border-radius: 18px; padding: 32px;">
    <p style="font-size: 14px; color: #30D158; margin: 0 0 8px; font-weight: 500;">✓ Request Approved</p>
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">${params.title}</h1>
    <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">
      Hi ${params.guestName}, request lo udah di-approve dan lagi di-download. Lo akan dapet email lagi pas udah ready di Jellyfin.
    </p>
    <a href="${APP_URL}/requests" style="display: inline-block; background: rgba(255,255,255,0.1); color: #fff; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 500; font-size: 14px;">
      Lihat status →
    </a>
  </div>
</body>
</html>
  `.trim();

  await r.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `✓ ${params.title} — Approved`,
    html,
  });
}

/**
 * Notif "Available" — film udah ready, tonton di Jellyfin
 */
export async function sendAvailableNotification(params: {
  to: string;
  guestName: string;
  title: string;
  mediaType: 'movie' | 'tv';
}) {
  const r = ensureResend();
  if (!r) return;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif; background: #000; color: #fff; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #1c1c1e; border-radius: 18px; padding: 32px;">
    <p style="font-size: 14px; color: #30D158; margin: 0 0 8px; font-weight: 500;">🎉 Available Now</p>
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">${params.title}</h1>
    <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">
      Hi ${params.guestName}, ${params.title} udah ready buat ditonton di Jellyfin!
    </p>
    <a href="${JELLYFIN_URL}" style="display: inline-block; background: #fff; color: #000; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Tonton di Jellyfin →
    </a>
  </div>
</body>
</html>
  `.trim();

  await r.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `🎉 ${params.title} udah ready!`,
    html,
  });
}

/**
 * Notif "Rejected"
 */
export async function sendRejectionNotification(params: {
  to: string;
  guestName: string;
  title: string;
  reason?: string;
}) {
  const r = ensureResend();
  if (!r) return;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif; background: #000; color: #fff; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #1c1c1e; border-radius: 18px; padding: 32px;">
    <p style="font-size: 14px; color: #FF453A; margin: 0 0 8px; font-weight: 500;">Request Declined</p>
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">${params.title}</h1>
    <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 16px;">
      Hi ${params.guestName}, sayangnya request ini gak bisa diproses.
    </p>
    ${params.reason ? `<p style="font-size: 13px; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px;">Alasan: ${params.reason}</p>` : ''}
  </div>
</body>
</html>
  `.trim();

  await r.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Request ${params.title} — Declined`,
    html,
  });
}
