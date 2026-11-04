/**
 * Film Connections — pipeline that generates the reference map
 *
 * ADMIN-TRIGGERED ONLY. Guests only read `APPROVED` rows (see getApprovedConnections),
 * and never call generateConnections().
 *
 * Pipeline:
 *   1. Source film detail (Jellyseerr) — must exist in the Jellyfin library
 *   2. LLM -> draft list of references
 *   3. Resolve each item to TMDB (search title+year via Jellyseerr)
 *   4. Filter: only those that EXIST in the Jellyfin library -> targetJellyfinId
 *   5. Upsert PENDING_REVIEW (@@unique prevents duplicates)
 */

import { prisma } from '@/lib/db';
import { jellyseerr } from '@/lib/jellyseerr';
import { getLibraryTmdbMap, libraryKey } from '@/lib/jellyfin';
import { suggestFilmReferences, FilmReferenceSuggestion } from '@/lib/anthropic';
import { getYear } from '@/lib/utils';
import sagasData from '@/lib/sagas.json';

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
 * Resolve one LLM suggestion to TMDB via Jellyseerr search.
 * Priority: same mediaType + matching year (tolerance ±1). Failure -> null (skipped).
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
    return match ?? null; // year does not match -> better to skip than pick the wrong film
  }
  return candidates[0];
}

/**
 * Generate draft connections for one film. Save as PENDING_REVIEW.
 * Existing rows (APPROVED/REJECTED) do not get their status reset — only the metadata is refreshed.
 */
export async function generateConnections(
  tmdbId: number,
  mediaType: MediaType
): Promise<GenerateSummary> {
  // 1. Source film
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
    // 3. Resolve to TMDB
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

    // 4. Must exist in the Jellyfin library
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
      // status/relationship/reason are intentionally left untouched — do not overwrite the admin's review result
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
  /** number of films connected to this film (0 = no map yet) */
  refCount: number;
}

export interface GraphEdgeOut {
  from: string;
  to: string;
  relationship: string;
  /** "out": the opened film references the other; "in": the other references the opened film */
  direction: 'out' | 'in';
  reason: string;
  reasonEn: string | null;
  /** One-paragraph explanation; null until one is written (callers fall back to `reason`). */
  storyEn: string | null;
  story: string | null;
  /** Finer relationship label (prequel, spinoff, ...); null = generic label of the type. */
  kind: string | null;
  confidence: string;
}

type Row = Awaited<ReturnType<typeof prisma.filmConnection.findMany>>[number];

const fk = (mediaType: string, tmdbId: number) => `${mediaType}:${tmdbId}`;

/**
 * Per film: its counterparts (from both directions), without duplicates.
 * If a pair of films has two rows (A->B and B->A), use the canonical direction:
 * the newer film references the older film.
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
 * For guests: the map of one film (nodes + edges) from APPROVED connections, both directions.
 * Pure DB read — ZERO LLM. If there are none yet -> empty nodes/edges.
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
    // fallback if the film is not in LibraryTitle yet: take it from the connection row
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
  // cinematic references first, then talent, director, universe (the 3D graph only fits a dozen or so)
  const PRIORITY = ['homage', 'inspired', 'visual', 'remake', 'talent', 'director', 'universe'];
  const ordered = [...mine].sort(
    (a, b) => PRIORITY.indexOf(a[1].relationship) - PRIORITY.indexOf(b[1].relationship)
  );
  for (const [other, r] of ordered) {
    nodes.push(nodeOf(other, false));
    edges.push({
      from: me, to: other, relationship: r.relationship,
      direction: fk(r.sourceMediaType, r.sourceTmdbId) === me ? 'out' : 'in',
      reason: r.reason, reasonEn: r.reasonEn, storyEn: r.storyEn, story: r.story, kind: r.kind, confidence: r.confidence,
    });
  }
  return { nodes, edges };
}

/**
 * For the Reference portal: all films that have a map (appearing in APPROVED connections, as
 * either source or target), sorted from most connected.
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
        kind: r.kind,
      };
    });
    // reference score: only "cinematic" relationships count (not universe/director/talent)
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
 * Search the whole library (title, original title, director). Each result carries a reference count
 * (0 = no map yet) so the portal can say "not mapped yet".
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
 * Backoffice: the whole library + reference coverage status.
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
      jellyfinId: t.jellyfinId, genres: t.genres, directors: t.directors, addedAt: t.addedAt,
      approved: approved.get(k) ?? 0, pending: pending.get(k) ?? 0,
    };
  });
}


/**
 * A–Z index of the whole library (compact): [tmdbId, mediaType, title, year, connection count].
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

/** A single title from the library (for the "no map yet" page). */
export async function getLibraryTitle(tmdbId: number, mediaType: MediaType) {
  const t = await prisma.libraryTitle.findUnique({ where: { tmdbId_mediaType: { tmdbId, mediaType } } });
  return t
    ? { tmdbId: t.tmdbId, mediaType: t.mediaType, title: t.title, year: t.year, jellyfinId: t.jellyfinId, directors: t.directors, genres: t.genres }
    : null;
}

/**
 * The whole APPROVED connection graph for the Galaxy page: one node per title that has connections,
 * one edge per pair (canonical direction: the newer references the older).
 */
export async function galaxyGraph(opts: { includePending?: boolean } = {}) {
  const approved = await approvedRows();
  // Admin preview: add connections awaiting review (marked pending, drawn dashed)
  const rows = opts.includePending
    ? [...approved, ...(await prisma.filmConnection.findMany({ where: { status: 'PENDING_REVIEW' } }))]
    : approved;
  const pairKey = (r: Row) => [fk(r.sourceMediaType, r.sourceTmdbId), fk(r.targetMediaType, r.targetTmdbId)].sort().join('|');
  const approvedPairs = new Set(approved.map(pairKey));
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

  const edges: Array<{ a: number; b: number; relationship: string; kind: string | null; srcIsA: boolean; pending: boolean }> = [];
  for (const [a, m] of adj) {
    for (const [b, r] of m) {
      if (a >= b) continue; // each pair once
      edges.push({
        a: index.get(a)!,
        b: index.get(b)!,
        relationship: r.relationship,
        kind: r.kind,
        srcIsA: fk(r.sourceMediaType, r.sourceTmdbId) === a,
        pending: !approvedPairs.has(pairKey(r)),
      });
    }
  }
  return { nodes, edges };
}

/**
 * Lightweight summary of one film for page metadata (tab title, link preview): title,
 * year, APPROVED connection count, one readable reason, and the TMDB poster if available.
 * Does not load the whole graph like getApprovedConnections.
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
 * Preview card (OG image) data for one film: the getFilmMeta summary plus the three strongest connections
 * (relationship type, direction, counterpart title) so the card shows the map, not just the poster.
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

/** List of map pages for the sitemap: all titles that have APPROVED connections, plus when they last changed. */
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

/**
 * Titles most recently added to Jellyfin (ordered by addedAt), with their APPROVED connection count.
 * `pendingBackfill` = some titles have no addedAt filled in yet (the library has not been synced since this column existed).
 */
export async function recentTitles(limit = 60) {
  const [titles, rows, missing] = await Promise.all([
    prisma.libraryTitle.findMany({ where: { addedAt: { not: null } }, orderBy: { addedAt: 'desc' }, take: limit }),
    approvedRows(),
    prisma.libraryTitle.count({ where: { addedAt: null } }),
  ]);
  const counts = adjacencyCounts(rows);
  return {
    pendingBackfill: missing > 0,
    titles: titles.map((t) => ({
      tmdbId: t.tmdbId,
      mediaType: t.mediaType,
      title: t.title,
      year: t.year,
      jellyfinId: t.jellyfinId,
      addedAt: t.addedAt!.toISOString(),
      count: counts.get(fk(t.mediaType, t.tmdbId)) ?? 0,
    })),
  };
}

// ===========================================================
// WATCH ORDER (sagas)
// ===========================================================

interface SagaFile {
  id: string;
  name: string;
  kind: 'curated' | 'auto';
  twoOrders: boolean;
  tip: Bi;
  lanes: { id: string; label: Bi; fork?: { title: string; year: number } }[];
  entries: { title: string; year: number; lane: string; release: string; when?: string; note?: Bi }[];
}
interface Bi {
  en: string;
  id: string;
}

const SAGAS = sagasData as unknown as SagaFile[];
const nameKey = (title: string, year: number | null | undefined) => `${title.toLowerCase()}|${year ?? ''}`;

/** title -> the saga that contains it (built once per process) */
const SAGA_OF = new Map<string, SagaFile>();
for (const s of SAGAS) for (const e of s.entries) SAGA_OF.set(nameKey(e.title, e.year), s);

/** The whole library in one pass, keyed by title+year (sagas.json stores names, not tmdbId). */
async function libraryByName() {
  const rows = await prisma.libraryTitle.findMany({
    select: { tmdbId: true, mediaType: true, title: true, year: true, jellyfinId: true },
  });
  return new Map(rows.map((r) => [nameKey(r.title, r.year), r]));
}

const releaseRank = (r: string) => {
  const [y, m] = r.split('-').map(Number);
  return y * 100 + (m || 13);
};

export interface SagaEntry {
  key: string;
  title: string;
  year: number;
  lane: string;
  when: string | null;
  note: Bi | null;
  release: string;
  /** position in the story order and in the release order */
  story: number;
  rel: number;
  tmdbId: number | null;
  mediaType: string | null;
  jellyfinId: string | null;
  /** APPROVED connection count — determines whether this title has a map */
  count: number;
}

function buildEntries(s: SagaFile, lib: Map<string, { tmdbId: number; mediaType: string; jellyfinId: string }>, counts: Map<string, number>) {
  const entries: SagaEntry[] = s.entries.map((e, story) => {
    const l = lib.get(nameKey(e.title, e.year));
    return {
      key: `${e.title}|${e.year}`,
      title: e.title,
      year: e.year,
      lane: e.lane,
      when: e.when ?? null,
      note: e.note ?? null,
      release: e.release,
      story,
      rel: 0,
      tmdbId: l?.tmdbId ?? null,
      mediaType: l?.mediaType ?? null,
      jellyfinId: l?.jellyfinId ?? null,
      count: l ? counts.get(fk(l.mediaType, l.tmdbId)) ?? 0 : 0,
    };
  });
  [...entries]
    .sort((a, b) => releaseRank(a.release) - releaseRank(b.release) || a.story - b.story)
    .forEach((e, i) => {
      e.rel = i;
    });
  return entries;
}

export interface SagaCard {
  id: string;
  name: string;
  kind: 'curated' | 'auto';
  total: number;
  /** title that already has a connection map */
  mapped: number;
  twoOrders: boolean;
  entries: SagaEntry[];
}

/**
 * List of all sagas for the Watch order index page: ordered from longest,
 * with the first few titles (story order) as posters.
 */
export async function listSagas(postersPerSaga = 9): Promise<SagaCard[]> {
  const [lib, rows] = await Promise.all([libraryByName(), approvedRows()]);
  const counts = adjacencyCounts(rows);
  return SAGAS.map((s) => {
    const entries = buildEntries(s, lib, counts);
    return {
      id: s.id,
      name: s.name,
      kind: s.kind,
      total: entries.length,
      mapped: entries.filter((e) => e.count > 0).length,
      twoOrders: s.twoOrders,
      entries: entries.slice(0, postersPerSaga),
    };
  }).sort((a, b) => (a.kind === b.kind ? b.total - a.total : a.kind === 'curated' ? -1 : 1));
}

/** Title (that exists in the library) -> saga id, to link the film map & Galaxy to Watch order. */
export async function sagaMembership() {
  const lib = await libraryByName();
  const out: Record<string, string> = {};
  for (const [key, saga] of SAGA_OF) {
    const l = lib.get(key);
    if (l) out[fk(l.mediaType, l.tmdbId)] = saga.id;
  }
  return out;
}

export interface SagaFull extends Omit<SagaCard, 'entries'> {
  tip: Bi;
  lanes: { id: string; label: Bi; fork: string | null }[];
  entries: SagaEntry[];
}

/** One complete saga for the Watch order page. */
export async function getSaga(id: string): Promise<SagaFull | null> {
  const s = SAGAS.find((x) => x.id === id);
  if (!s) return null;
  const [lib, rows] = await Promise.all([libraryByName(), approvedRows()]);
  const entries = buildEntries(s, lib, adjacencyCounts(rows));
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    tip: s.tip,
    total: entries.length,
    mapped: entries.filter((e) => e.count > 0).length,
    twoOrders: s.twoOrders,
    lanes: s.lanes.map((l) => ({ id: l.id, label: l.label, fork: l.fork ? `${l.fork.title}|${l.fork.year}` : null })),
    entries,
  };
}

export interface SagaHere {
  id: string;
  name: string;
  position: number;
  total: number;
  twoOrders: boolean;
  around: { key: string; title: string; year: number; tmdbId: number | null; mediaType: string | null; jellyfinId: string | null; here: boolean; mapped: boolean }[];
}

/**
 * "You are here": the position of one film within its saga, plus the nearest neighbours in the story order.
 * Used on the film map page so the map and Watch order connect to each other.
 */
export async function sagaHere(title: string, year: number | null, span = 5): Promise<SagaHere | null> {
  const s = SAGA_OF.get(nameKey(title, year));
  if (!s) return null;
  const [lib, rows] = await Promise.all([libraryByName(), approvedRows()]);
  const entries = buildEntries(s, lib, adjacencyCounts(rows));
  const at = entries.findIndex((e) => nameKey(e.title, e.year) === nameKey(title, year));
  if (at === -1) return null;
  const half = Math.floor(span / 2);
  const start = Math.max(0, Math.min(at - half, entries.length - span));
  return {
    id: s.id,
    name: s.name,
    position: at + 1,
    total: entries.length,
    twoOrders: s.twoOrders,
    around: entries.slice(Math.max(0, start), Math.max(0, start) + span).map((e) => ({
      key: e.key,
      title: e.title,
      year: e.year,
      tmdbId: e.tmdbId,
      mediaType: e.mediaType,
      jellyfinId: e.jellyfinId,
      here: e.story === at,
      mapped: e.count > 0,
    })),
  };
}
