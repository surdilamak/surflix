/**
 * Admin Session Management via Iron Session
 *
 * Cookie-based session, encrypted dengan SESSION_SECRET.
 * Cuma untuk admin (Idrus). Guest gak pake session, pake magic link.
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
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  },
};

export async function getSession() {
  return getIronSession<AdminSession>(cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
