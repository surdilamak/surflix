/**
 * Film Connections — pipeline generate peta referensi
 *
 * ADMIN-TRIGGERED ONLY. Guest cuma baca row `APPROVED` (lihat getApprovedConnections),
 * gak pernah manggil generateConnections().
 *
 * Pipeline:
 *   1. Detail film sumber (Jellyseerr) — harus ada di library Jellyfin
 *   2. LLM -> draft daftar referensi
 *   3. Resolve tiap item ke TMDB (search judul+tahun via Jellyseerr)
 *   4. Filter: cuma yang ADA di library Jellyfin -> targetJellyfinId
 *   5. Upsert PENDING_REVIEW (@@unique cegah duplikat)
 */

import { prisma } from '@/lib/db';
import { jellyseerr } from '@/lib/jellyseerr';
import { getLibraryTmdbMap, libraryKey } from '@/lib/jellyfin';
import { suggestFilmReferences, FilmReferenceSuggestion } from '@/lib/anthropic';
import { getYear } from '@/lib/utils';

export type MediaType = 'movie' | 'tv';

export interface GenerateSummary {
  source: { tmdbId: number; mediaType: MediaType; title: string };
  suggested: number;
  created: number;
  existing: number;
  skipped: Array<{ title: string; reason: string }>;
}

interface ResolvedTarget {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  poster: string | null;
}

function toYear(date: string | null | undefined): number | null {
  const y = parseInt(getYear(date), 10);
  return Number.isFinite(y) ? y : null;
}

/**
 * Resolve satu saran LLM ke TMDB lewat Jellyseerr search.
 * Prioritas: mediaType sama + tahun cocok (toleransi ±1). Gagal -> null (di-skip).
 */
async function resolveToTmdb(s: FilmReferenceSuggestion): Promise<ResolvedTarget | null> {
  const search = await jellyseerr.search(s.title);

  const candidates = (search.results ?? [])
    .filter((r) => r.mediaType === s.mediaType)
    .map((r) => ({
      tmdbId: r.id,
      mediaType: r.mediaType as MediaType,
      title: (r.title ?? r.name ?? '').trim(),
      year: toYear(r.releaseDate ?? r.firstAirDate),
      poster: r.posterPath ?? null,
    }))
    .filter((r) => r.title);

  if (candidates.length === 0) return null;

  if (s.year) {
    const match = candidates.find((c) => c.year !== null && Math.abs(c.year - s.year!) <= 1);
    return match ?? null; // tahun gak cocok -> mending skip daripada salah film
  }
  return candidates[0];
}

/**
 * Generate draft koneksi buat satu film. Simpan sebagai PENDING_REVIEW.
 * Row existing (APPROVED/REJECTED) gak di-reset statusnya — cuma metadata di-refresh.
 */
export async function generateConnections(
  tmdbId: number,
  mediaType: MediaType
): Promise<GenerateSummary> {
  // 1. Film sumber
  const detail = await jellyseerr.getMediaDetail(mediaType, tmdbId);
  const sourceTitle: string = (detail.title ?? detail.name ?? '').trim();
  if (!sourceTitle) throw new Error('Film sumber gak ketemu di TMDB');
  const sourceYear = toYear(detail.releaseDate ?? detail.firstAirDate);

  const library = await getLibraryTmdbMap();
  if (!library.has(libraryKey(mediaType, tmdbId))) {
    throw new Error('Film sumber belum ada di library Jellyfin');
  }

  // 2. LLM
  const suggestions = await suggestFilmReferences({ title: sourceTitle, year: sourceYear, mediaType });

  const summary: GenerateSummary = {
    source: { tmdbId, mediaType, title: sourceTitle },
    suggested: suggestions.length,
    created: 0,
    existing: 0,
    skipped: [],
  };

  for (const s of suggestions) {
    // 3. Resolve ke TMDB
    let target: ResolvedTarget | null = null;
    try {
      target = await resolveToTmdb(s);
    } catch (err: any) {
      console.warn('[connections] resolve failed:', s.title, err.message);
    }
    if (!target) {
      summary.skipped.push({ title: s.title, reason: 'gak ketemu di TMDB' });
      continue;
    }
    if (target.tmdbId === tmdbId && target.mediaType === mediaType) {
      summary.skipped.push({ title: s.title, reason: 'referensi ke diri sendiri' });
      continue;
    }

    // 4. Harus ada di library Jellyfin
    const jellyfinId = library.get(libraryKey(target.mediaType, target.tmdbId));
    if (!jellyfinId) {
      summary.skipped.push({ title: target.title, reason: 'gak ada di library' });
      continue;
    }

    // 5. Upsert
    const where = {
      sourceTmdbId_sourceMediaType_targetTmdbId: {
        sourceTmdbId: tmdbId,
        sourceMediaType: mediaType,
        targetTmdbId: target.tmdbId,
      },
    };
    const existing = await prisma.filmConnection.findUnique({ where });

    await prisma.filmConnection.upsert({
      where,
      create: {
        sourceTmdbId: tmdbId,
        sourceMediaType: mediaType,
        sourceTitle,
        sourceYear,
        sourceJellyfinId: library.get(libraryKey(mediaType, tmdbId)) ?? null,
        targetTmdbId: target.tmdbId,
        targetMediaType: target.mediaType,
        targetTitle: target.title,
        targetYear: target.year,
        targetPoster: target.poster,
        targetJellyfinId: jellyfinId,
        relationship: s.relationship,
        reason: s.reason,
        status: 'PENDING_REVIEW',
        source: 'llm',
      },
      // status/relationship/reason sengaja gak disentuh — jangan timpa hasil review admin
      update: {
        targetTitle: target.title,
        targetYear: target.year,
        targetPoster: target.poster,
        targetJellyfinId: jellyfinId,
      },
    });

    if (existing) summary.existing++;
    else summary.created++;
  }

  await prisma.eventLog.create({
    data: { type: 'connections.generated', payload: JSON.stringify(summary) },
  });

  return summary;
}

/**
 * Info film (poster/tahun/jellyfinId) dari baris lain yang kebetulan nunjuk film ini
 * sebagai target. FilmConnection gak nyimpen metadata sumber, jadi ini jalan paling murah.
 */
async function lookupAsTarget(tmdbId: number, mediaType: MediaType) {
  const row = await prisma.filmConnection.findFirst({
    where: { targetTmdbId: tmdbId, targetMediaType: mediaType },
    select: { targetYear: true, targetPoster: true, targetJellyfinId: true },
  });
  return {
    year: row?.targetYear ?? null,
    poster: row?.targetPoster ?? null,
    jellyfinId: row?.targetJellyfinId ?? null,
  };
}

/**
 * Buat guest: koneksi APPROVED dalam bentuk graph-ready (nodes + edges).
 * Murni baca DB — ZERO LLM. Kalau belum ada -> nodes/edges kosong.
 */
export async function getApprovedConnections(tmdbId: number, mediaType: MediaType) {
  const rows = await prisma.filmConnection.findMany({
    where: { sourceTmdbId: tmdbId, sourceMediaType: mediaType, status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length === 0) return { nodes: [], edges: [] };

  const asTarget = await lookupAsTarget(tmdbId, mediaType);
  const src = {
    year: rows[0].sourceYear ?? asTarget.year,
    poster: asTarget.poster,
    jellyfinId: rows[0].sourceJellyfinId ?? asTarget.jellyfinId,
  };

  const nodes = [
    {
      id: `${mediaType}:${tmdbId}`,
      tmdbId,
      mediaType,
      title: rows[0].sourceTitle,
      year: src.year,
      poster: src.poster,
      jellyfinId: src.jellyfinId,
      isSource: true,
    },
    ...rows.map((r) => ({
      id: `${r.targetMediaType}:${r.targetTmdbId}`,
      tmdbId: r.targetTmdbId,
      mediaType: r.targetMediaType,
      title: r.targetTitle,
      year: r.targetYear,
      poster: r.targetPoster,
      jellyfinId: r.targetJellyfinId,
      isSource: false,
    })),
  ];

  const edges = rows.map((r) => ({
    from: `${mediaType}:${tmdbId}`,
    to: `${r.targetMediaType}:${r.targetTmdbId}`,
    relationship: r.relationship,
    reason: r.reason,
  }));

  return { nodes, edges };
}

/**
 * Buat portal Referensi: daftar film yang punya peta referensi (APPROVED),
 * masing-masing dengan film-film yang nyambung ke dia (urut sesuai review).
 */
export async function listConnectedFilms() {
  const rows = await prisma.filmConnection.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
  });

  // metadata film (kalau film itu muncul sebagai target di baris lain)
  const meta = new Map<string, { year: number | null; poster: string | null; jellyfinId: string | null }>();
  for (const r of rows) {
    meta.set(`${r.targetMediaType}:${r.targetTmdbId}`, {
      year: r.targetYear, poster: r.targetPoster, jellyfinId: r.targetJellyfinId,
    });
  }

  type Ref = {
    tmdbId: number; mediaType: string; title: string; year: number | null;
    poster: string | null; jellyfinId: string | null; relationship: string; reason: string;
  };
  const films = new Map<string, {
    tmdbId: number; mediaType: string; title: string; count: number;
    year: number | null; poster: string | null; jellyfinId: string | null; refs: Ref[];
  }>();

  for (const r of rows) {
    const key = `${r.sourceMediaType}:${r.sourceTmdbId}`;
    let f = films.get(key);
    if (!f) {
      const m = meta.get(key);
      f = {
        tmdbId: r.sourceTmdbId, mediaType: r.sourceMediaType, title: r.sourceTitle, count: 0,
        year: r.sourceYear ?? m?.year ?? null, poster: m?.poster ?? null,
        jellyfinId: r.sourceJellyfinId ?? m?.jellyfinId ?? null, refs: [],
      };
      films.set(key, f);
    }
    f.count++;
    f.refs.push({
      tmdbId: r.targetTmdbId, mediaType: r.targetMediaType, title: r.targetTitle, year: r.targetYear,
      poster: r.targetPoster, jellyfinId: r.targetJellyfinId, relationship: r.relationship, reason: r.reason,
    });
  }

  return [...films.values()].sort((a, b) => a.title.localeCompare(b.title));
}
