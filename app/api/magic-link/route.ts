/**
 * POST /api/magic-link
 *
 * Kirim magic link ke email guest.
 * Cuma email yang udah pernah submit request yang bisa request magic link.
 * Token aktif 30 menit.
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

  // Rate limit ketat buat anti-spam email
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

  // Cek apakah email ini terdaftar (udah pernah submit request)
  const guest = await prisma.guest.findUnique({ where: { email } });

  if (!guest) {
    // Jangan kasih tau email gak terdaftar (security)
    // Return success aja, supaya gak bisa di-enumerate
    return NextResponse.json({ success: true, message: 'Kalau email terdaftar, link akan dikirim.' });
  }

  // Invalidate magic tokens yang lama (yang belum dipakai)
  await prisma.magicToken.updateMany({
    where: {
      guestId: guest.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() }, // mark as used jadi gak bisa dipakai
  });

  // Create token baru
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 menit

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
