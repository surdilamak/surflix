/**
 * POST /api/remark
 *
 * Guest submit "Request Improvement" untuk film yang sudah AVAILABLE atau
 * lagi PROCESSING di library. Contoh use case:
 * - Minta subtitle Indonesia/English
 * - Complaint kualitas file (request replace)
 * - Missing episodes di series
 * - Audio dubbed
 *
 * Beda dari /api/request:
 * - Note WAJIB (gak optional)
 * - Bypass duplicate request check
 * - Film harus EXIST di library/processing (kalau belum ada, redirect ke /api/request)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jellyseerr, JELLYSEERR_STATUS } from '@/lib/jellyseerr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyNewRemark } from '@/lib/telegram';
import { getYear } from '@/lib/utils';
import { resolveCanonicalGuestId } from '@/lib/guest';

const remarkSchema = z.object({
  guestName: z.string().min(2).max(50),
  guestId: z.string().optional(),
  note: z.string().min(5).max(200),
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  posterPath: z.string().optional().nullable(),
  releaseDate: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  const limit = await checkRateLimit({ ipAddress: ip, endpoint: 'remark' });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'Lo udah kirim banyak catatan. Coba lagi nanti ya.',
        resetAt: limit.resetAt,
      },
      { status: 429 }
    );
  }

  let body;
  try {
    body = remarkSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Input gak valid (note min 5 karakter)' }, { status: 400 });
  }

  // 1. Verify film ACTUALLY available/processing di Jellyseerr — kalau belum ada,
  //    user harusnya submit via /api/request, bukan remark.
  let mediaStatusLabel = 'AVAILABLE';
  try {
    const detail = await jellyseerr.getMediaDetail(body.mediaType, body.tmdbId);
    const status = detail.mediaInfo?.status;

    if (status === JELLYSEERR_STATUS.AVAILABLE) {
      mediaStatusLabel = 'AVAILABLE';
    } else if (status === JELLYSEERR_STATUS.PROCESSING) {
      mediaStatusLabel = 'PROCESSING';
    } else if (status === JELLYSEERR_STATUS.PARTIALLY_AVAILABLE) {
      mediaStatusLabel = 'PARTIALLY_AVAILABLE';
    } else {
      return NextResponse.json(
        {
          error: 'Film ini belum ada di library. Submit request biasa dulu ya.',
          shouldRequest: true,
        },
        { status: 400 }
      );
    }
  } catch (err) {
    console.warn('[Remark API] Jellyseerr check failed, proceeding anyway');
    // Tetap allow remark — kalau Jellyseerr down, default ke AVAILABLE
  }

  // 2. Get or create guest — follow alias chain to canonical
  let guest;
  if (body.guestId) {
    const canonicalId = await resolveCanonicalGuestId(body.guestId);
    if (canonicalId) {
      guest = await prisma.guest.update({
        where: { id: canonicalId },
        data: { name: body.guestName, lastActive: new Date() },
      });
    }
  }

  if (!guest) {
    const uniqueEmail = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@cookie.local`;
    guest = await prisma.guest.create({
      data: {
        name: body.guestName,
        email: uniqueEmail,
      },
    });
  }

  // 3. Create remark (no duplicate check — guest boleh kasih multiple remarks)
  const remark = await prisma.remark.create({
    data: {
      guestId: guest.id,
      tmdbId: body.tmdbId,
      mediaType: body.mediaType,
      title: body.title,
      posterPath: body.posterPath,
      mediaStatus: mediaStatusLabel,
      note: body.note,
      status: 'PENDING',
    },
  });

  // 4. Event log
  await prisma.eventLog.create({
    data: {
      type: 'remark.created',
      payload: JSON.stringify({ remarkId: remark.id, ip, guestName: guest.name, title: body.title }),
    },
  });

  // 5. Notify admin via Telegram (fire and forget)
  notifyNewRemark({
    remarkId: remark.id,
    guestName: guest.name,
    title: body.title,
    mediaType: body.mediaType,
    year: getYear(body.releaseDate),
    posterPath: body.posterPath,
    mediaStatus: mediaStatusLabel,
    note: body.note,
  }).catch((err) => console.error('[Telegram remark notify failed]', err));

  return NextResponse.json({
    success: true,
    remarkId: remark.id,
    guestId: guest.id,
    message: 'Catatan lo udah masuk. Admin akan review & follow-up kalau perlu.',
  });
}
