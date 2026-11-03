/**
 * Viewer (Jellyfin account) endpoints for the Reference portal.
 *
 *   GET    -> { loggedIn:false } or { loggedIn:true, name, played:[...], later:[...] } (keys like "movie:123")
 *   POST   -> { username, password } checked against Jellyfin, sets the viewer cookie
 *   DELETE -> clears the cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateUser, getPlayedKeys, getWatchLater } from '@/lib/jellyfin';
import { getViewerSession } from '@/lib/viewer-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({ username: z.string().min(1).max(100), password: z.string().max(200) });
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const session = await getViewerSession();
  if (!session.userId || !session.name) {
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
  return NextResponse.json({ loggedIn: true, name: session.name, played, later }, { headers: NO_STORE });
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
  const session = await getViewerSession();
  session.destroy();
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
