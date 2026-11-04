/**
 * Viewer session: a visitor who signed in with their Jellyfin account on the Reference portal.
 *
 * Separate from the admin session (different cookie). Only the Jellyfin user id and display name
 * are kept, in an encrypted cookie. No password and no Jellyfin token is stored.
 */

import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface ViewerSession {
  userId?: string;
  name?: string;
}

export const viewerSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'surflix_viewer',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    // Optional, e.g. ".surflix.my.id": one sign-in then works on the landing, Request Hub and Reference hosts.
    // Unset (local dev, single host): the cookie stays on the host that set it.
    ...(process.env.VIEWER_COOKIE_DOMAIN ? { domain: process.env.VIEWER_COOKIE_DOMAIN } : {}),
  },
};

export async function getViewerSession() {
  return getIronSession<ViewerSession>(await cookies(), viewerSessionOptions);
}
