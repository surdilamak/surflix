/**
 * Web Push wrapper — send a notification to all subscriptions belonging to 1 guest.
 *
 * Configured from env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 * If env is missing, the push functions become no-ops (silent skip so they do not block the flow).
 */

import webpush from 'web-push';
import { prisma } from './db';
import { resolveCanonicalGuestId } from './guest';
import { pickNotifLang, type NotifPayload } from './notif-messages';

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
 * Send a push notification to all subscriptions belonging to the guest.
 * Resolve the canonical Guest first, so that if the guestId passed in is a duplicate
 * from before the merge, the notification still reaches the devices subscribed via the canonical.
 *
 * Subscriptions that return 404/410 (expired/unsubscribed) are deleted from the DB.
 */
export async function sendPushToGuest(guestId: string, payload: NotifPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const canonicalId = await resolveCanonicalGuestId(guestId);
  if (!canonicalId) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { guestId: canonicalId },
  });
  if (subs.length === 0) return;

  // Guest language: stored in Guest.lang (filled from the surflix_lang cookie); older guests are assumed Indonesian
  const guest = await prisma.guest.findUnique({ where: { id: canonicalId }, select: { lang: true } });
  const body = JSON.stringify(pickNotifLang(payload, guest?.lang === 'en' ? 'en' : 'id'));

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
