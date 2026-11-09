/**
 * POST /api/request
 *
 * Submit a request for a film/series. Only signed-in Surflix accounts (401 otherwise); the name comes from
 * the account. The guestId returned in the response is saved to localStorage so My Requests keeps working.
 *
 * Flow:
 * 1. Validate input + rate limit per IP
 * 2. Upsert guest (by guestId from cookie/body, or create new)
 * 3. Check whether it already exists in Jellyseerr/library
 * 4. Save to DB with status PENDING_ADMIN
 * 5. Send Telegram notif to admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jellyseerr, JELLYSEERR_STATUS } from '@/lib/jellyseerr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyNewRequest } from '@/lib/telegram';
import { getYear } from '@/lib/utils';
import { getViewer } from '@/lib/viewer-session';
import { guestForViewer } from '@/lib/viewer-guest';

const requestSchema = z.object({
  // the name is no longer taken from the form: it comes from the signed-in account
  guestName: z.string().optional(),
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

  // Only signed-in Surflix accounts can submit
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: 'Masuk dulu dengan akun Surflix untuk mengirim ini.', needsLogin: true },
      { status: 401 }
    );
  }

  let body;
  try {
    body = requestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Input gak valid' }, { status: 400 });
  }

  // 1. Check in Jellyseerr — is it already in the library?
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

  // 2. The guest is the signed-in account (the earlier browser history is adopted the first time)
  const cookieLang = req.cookies.get('surflix_lang')?.value;
  const lang = cookieLang === 'en' || cookieLang === 'id' ? cookieLang : undefined;
  const guest = await guestForViewer(viewer, body.guestId, lang);

  // 3. Check for duplicates in our DB
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
