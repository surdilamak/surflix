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
 * Buat guest: koneksi APPROVED dalam bentuk graph-ready (nodes + edges).
 * Murni baca DB — ZERO LLM. Kalau belum ada -> nodes/edges kosong.
 */
export async function getApprovedConnections(tmdbId: number, mediaType: MediaType) {
  const rows = await prisma.filmConnection.findMany({
    where: { sourceTmdbId: tmdbId, sourceMediaType: mediaType, status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length === 0) return { nodes: [], edges: [] };

  const nodes = [
    {
      id: `${mediaType}:${tmdbId}`,
      tmdbId,
      mediaType,
      title: rows[0].sourceTitle,
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
