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

export const RELATIONSHIPS = ['homage', 'inspired', 'visual', 'remake', 'universe', 'director', 'talent'] as const;
export type RelationshipType = (typeof RELATIONSHIPS)[number];

export interface GraphNodeOut {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  jellyfinId: string | null;
  isSource: boolean;
  /** jumlah film yang nyambung ke film ini (0 = belum ada peta) */
  refCount: number;
}

export interface GraphEdgeOut {
  from: string;
  to: string;
  relationship: string;
  /** "out": film yang dibuka merujuk lawannya; "in": lawannya merujuk film yang dibuka */
  direction: 'out' | 'in';
  reason: string;
  reasonEn: string | null;
  confidence: string;
}

type Row = Awaited<ReturnType<typeof prisma.filmConnection.findMany>>[number];

const fk = (mediaType: string, tmdbId: number) => `${mediaType}:${tmdbId}`;

/**
 * Per film: lawan-lawannya (dari dua arah), tanpa duplikat.
 * Kalau sepasang film punya dua baris (A->B dan B->A), pakai arah kanonik:
 * film yang lebih baru merujuk film yang lebih lama.
 */
function buildAdjacency(rows: Row[]) {
  const adj = new Map<string, Map<string, Row>>();
  const consider = (film: string, other: string, row: Row) => {
    let m = adj.get(film);
    if (!m) adj.set(film, (m = new Map()));
    const prev = m.get(other);
    if (!prev || (row.sourceYear ?? 0) > (prev.sourceYear ?? 0)) m.set(other, row);
  };
  for (const r of rows) {
    const a = fk(r.sourceMediaType, r.sourceTmdbId);
    const b = fk(r.targetMediaType, r.targetTmdbId);
    consider(a, b, r);
    consider(b, a, r);
  }
  return adj;
}

async function approvedRows() {
  return prisma.filmConnection.findMany({ where: { status: 'APPROVED' }, orderBy: { createdAt: 'asc' } });
}

async function libraryMap(keys: string[]) {
  const titles = await prisma.libraryTitle.findMany({
    where: { OR: keys.map((k) => ({ mediaType: k.split(':')[0], tmdbId: Number(k.split(':')[1]) })) },
  });
  return new Map(titles.map((t) => [fk(t.mediaType, t.tmdbId), t]));
}

/**
 * Buat guest: peta satu film (nodes + edges) dari koneksi APPROVED, dua arah.
 * Murni baca DB — ZERO LLM. Kalau belum ada -> nodes/edges kosong.
 */
export async function getApprovedConnections(tmdbId: number, mediaType: MediaType) {
  const rows = await approvedRows();
  const adj = buildAdjacency(rows);
  const me = fk(mediaType, tmdbId);
  const mine = adj.get(me);
  if (!mine || mine.size === 0) return { nodes: [] as GraphNodeOut[], edges: [] as GraphEdgeOut[] };

  const keys = [me, ...mine.keys()];
  const lib = await libraryMap(keys);

  const nodeOf = (key: string, isSource: boolean): GraphNodeOut => {
    const [mt, id] = key.split(':');
    const l = lib.get(key);
    // cadangan kalau film belum ada di LibraryTitle: ambil dari baris koneksi
    let title = l?.title ?? '';
    let year = l?.year ?? null;
    let jellyfinId = l?.jellyfinId ?? null;
    if (!title) {
      for (const r of mine.values()) {
        if (fk(r.sourceMediaType, r.sourceTmdbId) === key) { title = r.sourceTitle; year ??= r.sourceYear; jellyfinId ??= r.sourceJellyfinId; break; }
        if (fk(r.targetMediaType, r.targetTmdbId) === key) { title = r.targetTitle; year ??= r.targetYear; jellyfinId ??= r.targetJellyfinId; break; }
      }
    }
    return {
      id: key, tmdbId: Number(id), mediaType: mt, title, year, jellyfinId, isSource,
      refCount: adj.get(key)?.size ?? 0,
    };
  };

  const nodes: GraphNodeOut[] = [nodeOf(me, true)];
  const edges: GraphEdgeOut[] = [];
  // referensi sinematik duluan, lalu talenta, sutradara, semesta (graph 3D cuma muat belasan)
  const PRIORITY = ['homage', 'inspired', 'visual', 'remake', 'talent', 'director', 'universe'];
  const ordered = [...mine].sort(
    (a, b) => PRIORITY.indexOf(a[1].relationship) - PRIORITY.indexOf(b[1].relationship)
  );
  for (const [other, r] of ordered) {
    nodes.push(nodeOf(other, false));
    edges.push({
      from: me, to: other, relationship: r.relationship,
      direction: fk(r.sourceMediaType, r.sourceTmdbId) === me ? 'out' : 'in',
      reason: r.reason, reasonEn: r.reasonEn, confidence: r.confidence,
    });
  }
  return { nodes, edges };
}

/**
 * Buat portal Referensi: semua film yang punya peta (muncul di koneksi APPROVED, sebagai
 * sumber maupun target), diurutkan dari yang paling banyak nyambung.
 */
export async function listConnectedFilms() {
  const rows = await approvedRows();
  const adj = buildAdjacency(rows);
  const keys = [...adj.keys()];
  const lib = await libraryMap(keys);

  const films = keys.map((key) => {
    const l = lib.get(key);
    const [mt, id] = key.split(':');
    const mine = adj.get(key)!;
    const refs = [...mine.entries()].map(([other, r]) => {
      const lo = lib.get(other);
      const isSrc = fk(r.sourceMediaType, r.sourceTmdbId) === key;
      return {
        tmdbId: Number(other.split(':')[1]),
        mediaType: other.split(':')[0],
        title: lo?.title ?? (isSrc ? r.targetTitle : r.sourceTitle),
        year: lo?.year ?? (isSrc ? r.targetYear : r.sourceYear),
        jellyfinId: lo?.jellyfinId ?? (isSrc ? r.targetJellyfinId : r.sourceJellyfinId),
        poster: null as string | null,
        relationship: r.relationship,
        direction: isSrc ? ('out' as const) : ('in' as const),
        reason: r.reason,
        reasonEn: r.reasonEn,
      };
    });
    // skor referensi: hanya hubungan "sinematik" yang dihitung (bukan semesta/sutradara/talenta)
    const refScore = refs.filter((r) => ['homage', 'inspired', 'visual', 'remake'].includes(r.relationship)).length;
    return {
      tmdbId: Number(id), mediaType: mt, title: l?.title ?? refs[0]?.title ?? '',
      year: l?.year ?? null, poster: null as string | null, jellyfinId: l?.jellyfinId ?? null,
      count: refs.length, refScore, refs,
    };
  });

  return films.sort(
    (a, b) => b.refScore - a.refScore || b.count - a.count || a.title.localeCompare(b.title)
  );
}

/**
 * Search seluruh library (judul, judul asli, sutradara). Tiap hasil bawa jumlah referensi
 * (0 = belum ada peta) supaya portal bisa bilang "belum dipetakan".
 */
export async function searchLibrary(q: string, limit = 12) {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await prisma.libraryTitle.findMany({
    where: {
      OR: [
        { title: { contains: term } },
        { originalTitle: { contains: term } },
        { directors: { contains: term } },
      ],
    },
    take: 60,
  });

  const counts = adjacencyCounts(await approvedRows());
  const lc = term.toLowerCase();
  const scored = rows.map((r) => {
    const t = r.title.toLowerCase();
    const score = (t === lc ? 0 : t.startsWith(lc) ? 1 : t.includes(lc) ? 2 : 3);
    return { r, score, n: counts.get(fk(r.mediaType, r.tmdbId)) ?? 0 };
  });
  scored.sort((a, b) => a.score - b.score || b.n - a.n || a.r.title.localeCompare(b.r.title));
  return scored.slice(0, limit).map(({ r, n }) => ({
    tmdbId: r.tmdbId, mediaType: r.mediaType, title: r.title, year: r.year,
    jellyfinId: r.jellyfinId, directors: r.directors, refCount: n,
  }));
}

function adjacencyCounts(rows: Row[]) {
  const adj = buildAdjacency(rows);
  return new Map([...adj.entries()].map(([k, m]) => [k, m.size]));
}

/**
 * Backoffice: seluruh library + status cakupan referensi.
 */
export async function libraryCoverage() {
  const [titles, all] = await Promise.all([
    prisma.libraryTitle.findMany({ orderBy: { title: 'asc' } }),
    prisma.filmConnection.findMany(),
  ]);
  const count = (status: string) =>
    adjacencyCounts(all.filter((r) => r.status === status));
  const approved = count('APPROVED');
  const pending = count('PENDING_REVIEW');
  return titles.map((t) => {
    const k = fk(t.mediaType, t.tmdbId);
    return {
      tmdbId: t.tmdbId, mediaType: t.mediaType, title: t.title, year: t.year,
      jellyfinId: t.jellyfinId, genres: t.genres, directors: t.directors,
      approved: approved.get(k) ?? 0, pending: pending.get(k) ?? 0,
    };
  });
}


/**
 * Indeks A–Z seluruh library (ringkas): [tmdbId, mediaType, title, year, jumlah koneksi].
 */
export async function libraryIndex() {
  const [titles, rows] = await Promise.all([
    prisma.libraryTitle.findMany({ select: { tmdbId: true, mediaType: true, title: true, year: true } }),
    approvedRows(),
  ]);
  const counts = adjacencyCounts(rows);
  return titles
    .map((t) => [t.tmdbId, t.mediaType, t.title, t.year, counts.get(fk(t.mediaType, t.tmdbId)) ?? 0] as const)
    .sort((a, b) => sortKey(a[2]).localeCompare(sortKey(b[2])));
}

function sortKey(title: string) {
  return title
    .replace(/^(the|a|an)\s+/i, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .toLowerCase();
}

/** Satu judul dari library (buat halaman "belum ada peta"). */
export async function getLibraryTitle(tmdbId: number, mediaType: MediaType) {
  const t = await prisma.libraryTitle.findUnique({ where: { tmdbId_mediaType: { tmdbId, mediaType } } });
  return t
    ? { tmdbId: t.tmdbId, mediaType: t.mediaType, title: t.title, year: t.year, jellyfinId: t.jellyfinId, directors: t.directors, genres: t.genres }
    : null;
}

/**
 * Seluruh graf koneksi APPROVED buat halaman Galaxy: satu node per judul yang punya koneksi,
 * satu sisi per pasangan (arah kanonik: yang lebih baru merujuk yang lebih lama).
 */
export async function galaxyGraph() {
  const rows = await approvedRows();
  const adj = buildAdjacency(rows);
  const keys = [...adj.keys()].sort();
  const lib = await libraryMap(keys);
  const index = new Map(keys.map((k, i) => [k, i]));

  const nodes = keys.map((key) => {
    const l = lib.get(key);
    const [mt, id] = key.split(':');
    const sample = adj.get(key)!.values().next().value as Row;
    const isSrc = fk(sample.sourceMediaType, sample.sourceTmdbId) === key;
    return {
      key,
      tmdbId: Number(id),
      mediaType: mt,
      title: l?.title ?? (isSrc ? sample.sourceTitle : sample.targetTitle),
      year: l?.year ?? (isSrc ? sample.sourceYear : sample.targetYear),
      jellyfinId: l?.jellyfinId ?? (isSrc ? sample.sourceJellyfinId : sample.targetJellyfinId),
      degree: adj.get(key)!.size,
    };
  });

  const edges: Array<{ a: number; b: number; relationship: string; srcIsA: boolean }> = [];
  for (const [a, m] of adj) {
    for (const [b, r] of m) {
      if (a >= b) continue; // tiap pasangan sekali
      edges.push({
        a: index.get(a)!,
        b: index.get(b)!,
        relationship: r.relationship,
        srcIsA: fk(r.sourceMediaType, r.sourceTmdbId) === a,
      });
    }
  }
  return { nodes, edges };
}

/**
 * Ringkasan ringan satu film buat metadata halaman (judul tab, preview link): judul,
 * tahun, jumlah koneksi APPROVED, satu alasan yang enak dibaca, dan poster TMDB kalau ada.
 * Tidak memuat seluruh graf seperti getApprovedConnections.
 */
export async function getFilmMeta(tmdbId: number, mediaType: MediaType) {
  const lib = await prisma.libraryTitle.findUnique({ where: { tmdbId_mediaType: { tmdbId, mediaType } } });
  const rows = await prisma.filmConnection.findMany({
    where: {
      status: 'APPROVED',
      OR: [
        { sourceTmdbId: tmdbId, sourceMediaType: mediaType },
        { targetTmdbId: tmdbId, targetMediaType: mediaType },
      ],
    },
  });
  if (!lib && rows.length === 0) return null;

  const isSource = (r: Row) => r.sourceTmdbId === tmdbId && r.sourceMediaType === mediaType;
  const others = new Set(rows.map((r) => (isSource(r) ? fk(r.targetMediaType, r.targetTmdbId) : fk(r.sourceMediaType, r.sourceTmdbId))));
  const PRIORITY = ['homage', 'inspired', 'visual', 'remake', 'talent', 'director', 'universe'];
  const best = [...rows].sort((a, b) => PRIORITY.indexOf(a.relationship) - PRIORITY.indexOf(b.relationship))[0];
  const asTarget = rows.find((r) => !isSource(r) && r.targetPoster);
  const first = rows[0];
  return {
    title: lib?.title ?? (first ? (isSource(first) ? first.sourceTitle : first.targetTitle) : ''),
    year: lib?.year ?? (first ? (isSource(first) ? first.sourceYear : first.targetYear) : null),
    jellyfinId: lib?.jellyfinId ?? null,
    poster: asTarget?.targetPoster ?? null,
    connections: others.size,
    reason: best ? best.reasonEn ?? best.reason : null,
  };
}

/**
 * Data kartu preview (OG image) satu film: ringkasan getFilmMeta plus tiga koneksi terkuat
 * (jenis hubungan, arah, judul lawan) supaya kartunya memperlihatkan peta, bukan cuma poster.
 */
export async function getFilmOgData(tmdbId: number, mediaType: MediaType) {
  const meta = await getFilmMeta(tmdbId, mediaType);
  if (!meta) return null;
  const rows = await prisma.filmConnection.findMany({
    where: {
      status: 'APPROVED',
      OR: [
        { sourceTmdbId: tmdbId, sourceMediaType: mediaType },
        { targetTmdbId: tmdbId, targetMediaType: mediaType },
      ],
    },
  });
  const PRIORITY = ['homage', 'inspired', 'visual', 'remake', 'talent', 'director', 'universe'];
  const isSource = (r: Row) => r.sourceTmdbId === tmdbId && r.sourceMediaType === mediaType;
  const seen = new Set<string>();
  const related = [...rows]
    .sort((a, b) => PRIORITY.indexOf(a.relationship) - PRIORITY.indexOf(b.relationship))
    .flatMap((r) => {
      const out = isSource(r);
      const key = out ? fk(r.targetMediaType, r.targetTmdbId) : fk(r.sourceMediaType, r.sourceTmdbId);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        relationship: r.relationship,
        direction: (out ? 'out' : 'in') as 'out' | 'in',
        title: out ? r.targetTitle : r.sourceTitle,
        year: out ? r.targetYear : r.sourceYear,
      }];
    })
    .slice(0, 3);
  return { ...meta, related };
}

/** Daftar halaman peta untuk sitemap: semua judul yang punya koneksi APPROVED, plus kapan terakhir berubah. */
export async function sitemapFilms() {
  const rows = await approvedRows();
  const latest = new Map<string, Date>();
  for (const r of rows) {
    const d = (r.reviewedAt ?? r.createdAt) as Date;
    for (const k of [fk(r.sourceMediaType, r.sourceTmdbId), fk(r.targetMediaType, r.targetTmdbId)]) {
      const cur = latest.get(k);
      if (!cur || d > cur) latest.set(k, d);
    }
  }
  return [...latest.entries()].map(([key, lastModified]) => {
    const [mediaType, id] = key.split(':');
    return { mediaType, tmdbId: Number(id), lastModified };
  });
}
