/**
 * Viewer (Jellyfin account) endpoints for the Reference portal.
 *
 *   GET    -> { loggedIn:false } or { loggedIn:true, name, via:'form'|'jellyfin', played:[...], later:[...], guestId } (keys like "movie:123")
 *   POST   -> { username, password } checked against Jellyfin, sets the viewer cookie
 *   DELETE -> clears the cookies (own session and the Jellyfin plugin cookie)
 *
 * Signed in = own cookie (form login) OR a valid `surflix_sso` cookie from the Jellyfin plugin (lib/sso-cookie.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateUser, getPlayedKeys, getWatchLater } from '@/lib/jellyfin';
import { clearViewer, getViewer, getViewerSession } from '@/lib/viewer-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { resolveCanonicalGuestId } from '@/lib/guest';

export const dynamic = 'force-dynamic';

const schema = z.object({ username: z.string().min(1).max(100), password: z.string().max(200) });
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const session = await getViewer();
  if (!session) {
    return NextResponse.json({ loggedIn: false }, { headers: NO_STORE });
  }
  // each list fails on its own: still signed in, just without those marks
  const [played, later] = await Promise.all([
    getPlayedKeys(session.userId).catch((err) => {
      console.error('[viewer] played list failed:', err);
      return [] as string[];
    }),
    getWatchLater(session.userId)
      .then((s) => [...s.entries.keys()])
      .catch((err) => {
        console.error('[viewer] watch-later list failed:', err);
        return [] as string[];
      }),
  ]);
  // the Request Hub guest linked to this account (so My Requests follows the account to another device)
  const linked = await prisma.guest.findUnique({ where: { jellyfinUserId: session.userId }, select: { id: true } }).catch(() => null);
  const guestId = linked ? await resolveCanonicalGuestId(linked.id).catch(() => null) : null;
  return NextResponse.json({ loggedIn: true, name: session.name, via: session.via, played, later, guestId }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit({ ipAddress: getClientIp(req.headers), endpoint: 'viewer-login', max: 15 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate' }, { status: 429, headers: NO_STORE });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400, headers: NO_STORE });
  }

  let viewer;
  try {
    viewer = await authenticateUser(body.username, body.password);
  } catch (err) {
    console.error('[viewer] jellyfin login failed:', err);
    return NextResponse.json({ error: 'unavailable' }, { status: 502, headers: NO_STORE });
  }
  if (!viewer) return NextResponse.json({ error: 'credentials' }, { status: 401, headers: NO_STORE });

  const session = await getViewerSession();
  session.userId = viewer.userId;
  session.name = viewer.name;
  await session.save();
  return NextResponse.json({ ok: true, name: viewer.name }, { headers: NO_STORE });
}

export async function DELETE() {
  await clearViewer();
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
