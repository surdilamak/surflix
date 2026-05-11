/**
 * POST /api/request
 *
 * Guest submit request film/series.
 * Flow:
 * 1. Validate input + rate limit per IP
 * 2. Upsert guest (by email)
 * 3. Cek udah ada di Jellyseerr/library belum (anti-duplikat)
 * 4. Simpan ke DB dengan status PENDING_ADMIN
 * 5. Send Telegram notif ke admin
 *
 * NOTE: Request belum di-forward ke Jellyseerr di sini.
 *       Itu terjadi pas admin approve via /api/admin/approve.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jellyseerr, JELLYSEERR_STATUS } from '@/lib/jellyseerr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyNewRequest } from '@/lib/telegram';
import { isValidEmail, getYear } from '@/lib/utils';

const requestSchema = z.object({
  guestName: z.string().min(1).max(50),
  guestEmail: z.string().email(),
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  posterPath: z.string().optional().nullable(),
  backdropPath: z.string().optional().nullable(),
  overview: z.string().optional().nullable(),
  releaseDate: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Rate limit: max 10 request/jam per IP
  const limit = await checkRateLimit({ ipAddress: ip, endpoint: 'request' });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'Lo udah request terlalu banyak. Coba lagi nanti ya.',
        resetAt: limit.resetAt,
      },
      { status: 429 }
    );
  }

  let body;
  try {
    body = requestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Input gak valid', details: err }, { status: 400 });
  }

  if (!isValidEmail(body.guestEmail)) {
    return NextResponse.json({ error: 'Email gak valid' }, { status: 400 });
  }

  // 1. Cek di Jellyseerr — udah ada di library?
  try {
    const detail = await jellyseerr.getMediaDetail(body.mediaType, body.tmdbId);
    if (detail.mediaInfo?.status === JELLYSEERR_STATUS.AVAILABLE) {
      return NextResponse.json(
        { error: 'Film ini udah ada di library!', alreadyAvailable: true },
        { status: 409 }
      );
    }
    if (detail.mediaInfo?.status === JELLYSEERR_STATUS.PROCESSING) {
      return NextResponse.json(
        { error: 'Film ini lagi di-download. Tunggu sebentar.', alreadyProcessing: true },
        { status: 409 }
      );
    }
  } catch (err) {
    // Kalau Jellyseerr gak respond, lanjut aja, biar admin yang verify
    console.warn('[Request API] Jellyseerr check failed, proceeding anyway');
  }

  // 2. Upsert guest
  const guest = await prisma.guest.upsert({
    where: { email: body.guestEmail.toLowerCase() },
    update: { name: body.guestName, lastActive: new Date() },
    create: {
      email: body.guestEmail.toLowerCase(),
      name: body.guestName,
    },
  });

  // 3. Cek duplikat di DB kita (orang yang sama, request film yang sama)
  const existing = await prisma.request.findFirst({
    where: {
      guestId: guest.id,
      tmdbId: body.tmdbId,
      mediaType: body.mediaType,
      status: { in: ['PENDING_ADMIN', 'APPROVED', 'PROCESSING'] },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Lo udah pernah request film ini.', requestId: existing.id },
      { status: 409 }
    );
  }

  // 4. Create request
  const newRequest = await prisma.request.create({
    data: {
      guestId: guest.id,
      tmdbId: body.tmdbId,
      mediaType: body.mediaType,
      title: body.title,
      posterPath: body.posterPath,
      backdropPath: body.backdropPath,
      overview: body.overview,
      releaseDate: body.releaseDate,
      rating: body.rating,
      status: 'PENDING_ADMIN',
    },
  });

  // 5. Event log
  await prisma.eventLog.create({
    data: {
      type: 'request.created',
      payload: JSON.stringify({ requestId: newRequest.id, ip, guestEmail: guest.email }),
    },
  });

  // 6. Notify admin via Telegram (fire and forget)
  notifyNewRequest({
    requestId: newRequest.id,
    guestName: guest.name,
    guestEmail: guest.email,
    title: body.title,
    mediaType: body.mediaType,
    year: getYear(body.releaseDate),
  }).catch((err) => console.error('[Telegram notify failed]', err));

  return NextResponse.json({
    success: true,
    requestId: newRequest.id,
    message: 'Request lo udah masuk. Admin akan review dalam 1-3 hari.',
  });
}
