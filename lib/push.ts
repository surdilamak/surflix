/**
 * Web Push wrapper — kirim notification ke semua subscription milik 1 guest.
 *
 * Configured dari env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 * Kalau env gak ada, fungsi-fungsi push jadi no-op (silent skip biar gak block flow).
 */

import webpush from 'web-push';
import { prisma } from './db';
import { resolveCanonicalGuestId } from './guest';
import type { NotifPayload } from './notif-messages';

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@surflix.my.id';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
    return true;
  } catch (err) {
    console.warn('[Push] VAPID setup failed:', (err as Error).message);
    return false;
  }
}

export function isPushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export function getPublicKey(): string | null {
  return PUBLIC_KEY || null;
}

/**
 * Kirim push notification ke semua subscription milik guest.
 * Resolve canonical Guest dulu, supaya kalau guestId yang dipanggil adalah duplikat
 * pre-merge, notif tetap nyampe ke device-device yang subscribe via canonical.
 *
 * Subscription yang return 404/410 (expired/unsubscribed) di-delete dari DB.
 */
export async function sendPushToGuest(guestId: string, payload: NotifPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const canonicalId = await resolveCanonicalGuestId(guestId);
  if (!canonicalId) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { guestId: canonicalId },
  });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsed: new Date() },
        });
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired/revoked → cleanup
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.warn('[Push] send failed:', sub.endpoint.slice(0, 40), statusCode, err?.message);
        }
      }
    })
  );
}
