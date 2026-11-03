/**
 * Admin Session Management via Iron Session
 *
 * Cookie-based session, encrypted with SESSION_SECRET.
 * Only for the admin (Idrus). Guests do not use a session, they use a magic link.
 */

import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface AdminSession {
  adminId?: string;
  username?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'surflix_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  // Next 15: cookies() async
  return getIronSession<AdminSession>(await cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
