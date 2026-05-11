/**
 * POST /api/verify
 *
 * Verify magic link token, return short-lived JWT-like token
 * yang bisa dipakai untuk akses /api/requests/me.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/db';

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Token gak valid' }, { status: 400 });
  }

  const record = await prisma.magicToken.findUnique({
    where: { token: body.token },
    include: { guest: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Link expired atau gak valid' }, { status: 401 });
  }

  // Mark as used
  await prisma.magicToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  // Update guest last active
  await prisma.guest.update({
    where: { id: record.guestId },
    data: { lastActive: new Date() },
  });

  // Generate session token (JWT) — aktif 7 hari
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  const sessionToken = await new SignJWT({
    guestId: record.guestId,
    email: record.guest.email,
    name: record.guest.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return NextResponse.json({
    success: true,
    token: sessionToken,
    guest: {
      name: record.guest.name,
      email: record.guest.email,
    },
  });
}
