/**
 * POST /api/remark
 *
 * Signed-in account submits "Request Improvement" for a film that is already AVAILABLE or
 * currently PROCESSING in the library. Example use cases:
 * - Ask for Indonesian/English subtitles
 * - Complaint about file quality (request replace)
 * - Missing episodes in a series
 * - Dubbed audio
 *
 * Different from /api/request:
 * - Note is REQUIRED (not optional)
 * - Bypasses the duplicate request check
 * - Film must EXIST in the library/processing (if not there yet, redirect to /api/request)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jellyseerr, JELLYSEERR_STATUS } from '@/lib/jellyseerr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyNewRemark } from '@/lib/telegram';
import { getYear } from '@/lib/utils';
import { getViewer } from '@/lib/viewer-session';
import { guestForViewer } from '@/lib/viewer-guest';

const remarkSchema = z.object({
  // the name is no longer taken from the form: it comes from the signed-in account
  guestName: z.string().optional(),
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
    body = remarkSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Input gak valid (note min 5 karakter)' }, { status: 400 });
  }

  // 1. Verify film ACTUALLY available/processing in Jellyseerr — if it isn't there yet,
  //    the user should submit via /api/request, not a remark.
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
    // Still allow the remark — if Jellyseerr is down, default to AVAILABLE
  }

  // 2. The guest is the signed-in account (the earlier browser history is adopted the first time)
  const cookieLang = req.cookies.get('surflix_lang')?.value;
  const lang = cookieLang === 'en' || cookieLang === 'id' ? cookieLang : undefined;
  const guest = await guestForViewer(viewer, body.guestId, lang);

  // 3. Create remark (no duplicate check — a guest may give multiple remarks)
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
