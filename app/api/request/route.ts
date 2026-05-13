/**
 * POST /api/request
 *
 * Guest submit request film/series — name only, no email.
 * Identification via guestId (returned in response, saved to localStorage).
 *
 * Flow:
 * 1. Validate input + rate limit per IP
 * 2. Upsert guest (by guestId from cookie/body, or create new)
 * 3. Cek udah ada di Jellyseerr/library belum
 * 4. Simpan ke DB dengan status PENDING_ADMIN
 * 5. Send Telegram notif ke admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jellyseerr, JELLYSEERR_STATUS } from '@/lib/jellyseerr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyNewRequest } from '@/lib/telegram';
import { getYear } from '@/lib/utils';

const requestSchema = z.object({
  guestName: z.string().min(2).max(50),
  guestId: z.string().optional(),
  guestNote: z.string().max(200).optional(),
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
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
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
    console.warn('[Request API] Jellyseerr check failed, proceeding anyway');
  }

  // 2. Get or create guest
  let guest;
  if (body.guestId) {
    // Returning guest - update name kalau berubah
    guest = await prisma.guest.findUnique({ where: { id: body.guestId } });
    if (guest) {
      guest = await prisma.guest.update({
        where: { id: body.guestId },
        data: { name: body.guestName, lastActive: new Date() },
      });
    }
  }

  if (!guest) {
    // New guest - email field di-store sebagai unique key, kita pake guestId#timestamp
    // Karena email field di schema masih unique-required, kita generate dummy email
    const uniqueEmail = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@cookie.local`;
    guest = await prisma.guest.create({
      data: {
        name: body.guestName,
        email: uniqueEmail,
      },
    });
  }

  // 3. Cek duplikat di DB kita
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
      guestNote: body.guestNote,
      status: 'PENDING_ADMIN',
    },
  });

  // 5. Event log
  await prisma.eventLog.create({
    data: {
      type: 'request.created',
      payload: JSON.stringify({ requestId: newRequest.id, ip, guestName: guest.name }),
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
    posterPath: body.posterPath,
    overview: body.overview,
    guestNote: body.guestNote,
  }).catch((err) => console.error('[Telegram notify failed]', err));

  return NextResponse.json({
    success: true,
    requestId: newRequest.id,
    guestId: guest.id,
    message: 'Request lo udah masuk. Admin akan review dalam 1-3 hari.',
  });
}
