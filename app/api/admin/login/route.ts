/**
 * POST /api/admin/login
 *
 * DB-based admin auth. On startup, admin di-bootstrap dari env vars.
 * Multiple admins bisa di-add via /admin/settings (later).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { bootstrapAdmin } from '@/lib/admin-bootstrap';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

let bootstrapped = false;

export async function POST(req: NextRequest) {
  // Bootstrap admin on first request (lazy init)
  if (!bootstrapped) {
    await bootstrapAdmin();
    bootstrapped = true;
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({
    where: { username: body.username },
  });

  if (!admin) {
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
  }

  const valid = await bcrypt.compare(body.password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
  }

  // Update last login
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const session = await getSession();
  session.adminId = admin.id;
  session.username = admin.username;
  session.isLoggedIn = true;
  await session.save();

  await prisma.eventLog.create({
    data: {
      type: 'admin.login',
      payload: JSON.stringify({ username: admin.username, at: new Date() }),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
