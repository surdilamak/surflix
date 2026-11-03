/**
 * POST /api/magic-link
 *
 * Send a magic link to the guest's email.
 * Only emails that have submitted a request before can request a magic link.
 * Token is valid for 30 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { sendMagicLink } from '@/lib/email';
import { generateToken } from '@/lib/utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Strict rate limit to prevent email spam
  const limit = await checkRateLimit({ ipAddress: ip, endpoint: 'magic-link', max: 5 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak request. Coba lagi nanti.' },
      { status: 429 }
    );
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Email gak valid' }, { status: 400 });
  }

  const email = body.email.toLowerCase();

  // Check whether this email is registered (has submitted a request before)
  const guest = await prisma.guest.findUnique({ where: { email } });

  if (!guest) {
    // Don't reveal that the email is not registered (security)
    // Just return success, so it can't be enumerated
    return NextResponse.json({ success: true, message: 'Kalau email terdaftar, link akan dikirim.' });
  }

  // Invalidate old magic tokens (the ones not yet used)
  await prisma.magicToken.updateMany({
    where: {
      guestId: guest.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() }, // mark as used so it can't be used
  });

  // Create new token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await prisma.magicToken.create({
    data: {
      token,
      guestId: guest.id,
      expiresAt,
    },
  });

  // Send email
  try {
    await sendMagicLink({
      to: email,
      guestName: guest.name,
      token,
    });
  } catch (err: any) {
    console.error('[Magic Link] Email send failed:', err.message);
    return NextResponse.json({ error: 'Gagal kirim email. Coba lagi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
