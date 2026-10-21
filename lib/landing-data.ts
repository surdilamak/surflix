/**
 * Data buat landing (server component): angka library, poster, satu koneksi nyata yang
 * berganti tiap kunjungan, dan judul-judul yang dipakai di tiap bagian.
 * Murni baca DB (tanpa LLM). Daftar film di-cache 10 menit; pilihan koneksi diacak per request.
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

/** Satu saga buat gambar kecil "urutan tonton" di landing. */
export interface LandingSaga {
  id: string;
  name: string;
  titles: LandingFilm[];
}

export interface LandingPair {
  /** film yang merujuk (yang lebih baru) */
  from: LandingFilm;
  /** film yang dirujuk */
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
  // satu saga yang posternya lengkap, buat gambar kecil Watch order
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

  // 2001 membuka mosaik Streaming (subjek tunggal di tengah, terbaca sebagai potongan ubin).
  const showcase = (await libraryFilm(62)) ?? films[0] ?? null;
  // Film demo buat alur Request (Dune: Part Two), cadangan: film pertama.
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
