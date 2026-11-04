/**
 * Cookie written by the Surflix Jellyfin plugin (jellyfin-plugin/) when someone signs in to Jellyfin.
 * It lets Surflix treat that person as signed in without a second login.
 *
 * Format: base64url(JSON {u: userId, n: name, e: expiry in epoch seconds}) + "." + base64url(HMAC-SHA256(payload)).
 * The shared secret (SSO_SHARED_SECRET) is set on both Jellyfin and Surflix. Without it this feature is off.
 * Only a user id and a display name travel in the cookie; no password and no Jellyfin token.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SSO_COOKIE = 'surflix_sso';

export function verifySsoCookie(value: string | undefined, now = Date.now()): { userId: string; name: string } | null {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret || secret.length < 16 || !value) return null;
  const dot = value.indexOf('.');
  if (dot < 1) return null;
  const payload = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1), 'base64url');
  const expected = createHmac('sha256', secret).update(payload).digest();
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof p.u !== 'string' || typeof p.n !== 'string' || !p.u || typeof p.e !== 'number') return null;
    if (p.e * 1000 < now) return null;
    return { userId: p.u, name: p.n };
  } catch {
    return null;
  }
}
