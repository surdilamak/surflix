/**
 * Data for the landing (server component): library numbers, posters, one real connection that
 * changes on each visit, and the titles used in each section.
 * Pure DB read (no LLM). The film list is cached for 10 minutes; the connection pick is randomized per request.
 */
import { prisma } from '@/lib/db';
import { libraryIndex, listConnectedFilms, listSagas } from '@/lib/connections';

export interface LandingFilm {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  jellyfinId: string;
  count: number;
}

/** One saga for the small "watch order" graphic on the landing. */
export interface LandingSaga {
  id: string;
  name: string;
  titles: LandingFilm[];
}

export interface LandingPair {
  /** the referencing film (the newer one) */
  from: LandingFilm;
  /** the referenced film */
  to: LandingFilm;
  relationship: string;
  reason: string;
  reasonId?: string;
}

const TTL_MS = 10 * 60 * 1000;
const CINEMATIC = new Set(['homage', 'inspired', 'visual', 'remake']);
let cache: { at: number; films: LandingFilm[]; pairs: LandingPair[]; saga: LandingSaga | null } | null = null;

async function connected() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;

  const all = await listConnectedFilms();
  const films: LandingFilm[] = [];
  const pairs: LandingPair[] = [];
  const seen = new Set<string>();
  const key = (mt: string, id: number) => `${mt}:${id}`;

  for (const f of all) {
    if (!f.jellyfinId) continue;
    const self: LandingFilm = {
      tmdbId: f.tmdbId, mediaType: f.mediaType, title: f.title, year: f.year, jellyfinId: f.jellyfinId, count: f.count,
    };
    films.push(self);

    for (const r of f.refs) {
      if (!r.jellyfinId || !r.reasonEn || !CINEMATIC.has(r.relationship)) continue;
      const other: LandingFilm = {
        tmdbId: r.tmdbId, mediaType: r.mediaType, title: r.title, year: r.year, jellyfinId: r.jellyfinId, count: 0,
      };
      const [from, to] = r.direction === 'out' ? [self, other] : [other, self];
      const k = `${key(from.mediaType, from.tmdbId)}>${key(to.mediaType, to.tmdbId)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      pairs.push({ from, to, relationship: r.relationship, reason: r.reasonEn, reasonId: r.reason });
    }
  }
  // one saga whose posters are all available, for the small Watch order graphic
  const sagas = await listSagas(6).catch(() => []);
  const pick = sagas.find((x) => x.entries.filter((e) => e.jellyfinId).length >= 4) ?? null;
  const saga: LandingSaga | null = pick
    ? {
        id: pick.id,
        name: pick.name,
        titles: pick.entries
          .filter((e) => e.jellyfinId)
          .slice(0, 4)
          .map((e) => ({
            tmdbId: e.tmdbId ?? 0,
            mediaType: e.mediaType ?? 'movie',
            title: e.title,
            year: e.year,
            jellyfinId: e.jellyfinId as string,
            count: e.count,
          })),
      }
    : null;

  return (cache = { at: Date.now(), films, pairs, saga });
}

async function libraryFilm(tmdbId: number): Promise<LandingFilm | null> {
  const t = await prisma.libraryTitle.findUnique({ where: { tmdbId_mediaType: { tmdbId, mediaType: 'movie' } } });
  return t ? { tmdbId: t.tmdbId, mediaType: t.mediaType, title: t.title, year: t.year, jellyfinId: t.jellyfinId, count: 0 } : null;
}

let statsCache: { at: number; movies: number; series: number; mapped: number } | null = null;

async function libraryStats() {
  if (statsCache && Date.now() - statsCache.at < 5 * 60 * 1000) return statsCache;
  const [movies, series, index] = await Promise.all([
    prisma.libraryTitle.count({ where: { mediaType: 'movie' } }),
    prisma.libraryTitle.count({ where: { mediaType: 'tv' } }),
    libraryIndex(),
  ]);
  return (statsCache = { at: Date.now(), movies, series, mapped: index.filter((r) => r[4] > 0).length });
}

export async function getLandingData() {
  const [{ movies, series, mapped }, { films, pairs, saga }] = await Promise.all([libraryStats(), connected()]);

  // 2001 opens the Streaming mosaic (a single subject in the center, reads as tile pieces).
  const showcase = (await libraryFilm(62)) ?? films[0] ?? null;
  // Demo film for the Request flow (Dune: Part Two), fallback: the first film.
  const demo = (await libraryFilm(693134)) ?? films[1] ?? films[0] ?? null;
  const spotlight = pairs.length ? pairs[Math.floor(Math.random() * pairs.length)] : null;

  return {
    stats: { movies, series, mapped },
    hero: films.slice(0, 30),
    gallery: films.length >= 50 ? films.slice(30, 50) : films.slice(0, 20),
    showcase,
    demo,
    spotlight,
    saga,
  };
}
