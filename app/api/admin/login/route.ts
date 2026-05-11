/**
 * POST /api/admin/login
 *
 * Admin login dengan username + password (bcrypt-hashed di env).
 * Pakai iron-session untuk persistent cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  // Compare with env vars (single admin setup)
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    return NextResponse.json({ error: 'Admin belum di-setup' }, { status: 500 });
  }

  if (body.username !== expectedUsername) {
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
  }

  const valid = await bcrypt.compare(body.password, expectedHash);
  if (!valid) {
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
  }

  // Set session
  const session = await getSession();
  session.adminId = expectedUsername;
  session.username = expectedUsername;
  session.isLoggedIn = true;
  await session.save();

  // Optional: track last login in DB (kalau lo punya admin record)
  await prisma.eventLog.create({
    data: {
      type: 'admin.login',
      payload: JSON.stringify({ username: expectedUsername, at: new Date() }),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
