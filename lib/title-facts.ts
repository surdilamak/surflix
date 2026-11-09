/**
 * Title facts for the Reference pages: synopsis, runtime, genres, cast and the scores that help someone
 * decide whether a title is worth their evening (TMDB always; IMDb, Rotten Tomatoes and Metacritic when
 * a source is available).
 *
 * Sources, in order:
 *  - Jellyseerr (`/movie/:id`, `/tv/:id`): synopsis, runtime, genres, cast, TMDB score, IMDb id.
 *  - OMDb (only when OMDB_API_KEY is set): IMDb rating + votes, Metascore, Rotten Tomatoes. This is the
 *    only source of the Metacritic score.
 *  - Jellyseerr `/movie/:id/ratingscombined` (movies only, slow): Rotten Tomatoes and IMDb, asked only
 *    when OMDb lacks them. Best effort.
 * A source that fails or is missing simply leaves its score out; nothing here may break the page.
 */

import { jellyseerr } from '@/lib/jellyseerr';

export interface TitleFacts {
  title: string;
  tagline: string | null;
  overview: string | null;
  runtime: number | null;
  genres: string[];
  director: string | null;
  creators: string[] | null;
  cast: string[];
  seasons: number | null;
  scores: {
    tmdb?: { value: number; votes: number | null };
    imdb?: { value: number; votes: string | null };
    rottenTomatoes?: { critics?: number; audience?: number };
    metacritic?: { value: number };
  };
}

const TTL_OK = 6 * 60 * 60 * 1000;
const TTL_MISS = 5 * 60 * 1000;
const cache = new Map<string, { data: TitleFacts | null; expiresAt: number }>();
/** concurrent callers (page metadata, the OG image, the client) share one lookup */
const inflight = new Map<string, Promise<TitleFacts | null>>();

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

async function fromOmdb(imdbId: string): Promise<TitleFacts['scores']> {
  const scores: TitleFacts['scores'] = {};
  const key = process.env.OMDB_API_KEY;
  if (!key) return scores;
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return scores;
    const d = await res.json();
    if (d.Response === 'False') return scores;
    const imdb = num(d.imdbRating);
    if (imdb != null) scores.imdb = { value: imdb, votes: d.imdbVotes && d.imdbVotes !== 'N/A' ? String(d.imdbVotes) : null };
    const meta = num(d.Metascore);
    if (meta != null) scores.metacritic = { value: meta };
    const rt = (d.Ratings || []).find((r: { Source?: string }) => r.Source === 'Rotten Tomatoes');
    const rtv = rt ? num(String(rt.Value).replace('%', '')) : null;
    if (rtv != null) scores.rottenTomatoes = { ...scores.rottenTomatoes, critics: rtv };
  } catch {
    /* leave the scores out */
  }
  return scores;
}

async function fromJellyseerrRatings(type: 'movie' | 'tv', id: number): Promise<TitleFacts['scores']> {
  const scores: TitleFacts['scores'] = {};
  try {
    const data = await jellyseerr.getCombinedRatings(type, id);
    const rt = data?.rt;
    if (rt) {
      const critics = num(rt.criticsScore);
      const audience = num(rt.audienceScore);
      if (critics != null || audience != null) {
        scores.rottenTomatoes = { ...(critics != null ? { critics } : {}), ...(audience != null ? { audience } : {}) };
      }
    }
    const imdb = num(data?.imdb?.criticsScore);
    if (imdb != null) scores.imdb = { value: imdb, votes: null };
  } catch {
    /* leave the scores out */
  }
  return scores;
}

async function lookup(type: 'movie' | 'tv', id: number): Promise<TitleFacts | null> {
  try {
    const d = await jellyseerr.getMediaDetail(type, id);
    const crew: Array<{ job?: string; name: string }> = d.credits?.crew || [];
    const directors = crew.filter((c) => c.job === 'Director' || c.job === 'Series Director').map((c) => c.name);
    const scores: TitleFacts['scores'] = {};
    const avg = num(d.voteAverage);
    if (avg != null && avg > 0) scores.tmdb = { value: avg, votes: num(d.voteCount) };

    // OMDb first (it is the only source of Metacritic and is fast). Jellyseerr's `ratingscombined` is slow
    // (it fetches the scores from outside) and exists for movies only, so it is asked only for a movie
    // where OMDb did not return both IMDb and Rotten Tomatoes.
    const imdbId: string | undefined = d.externalIds?.imdbId || d.mediaInfo?.imdbId;
    const omdb: TitleFacts['scores'] = imdbId ? await fromOmdb(imdbId) : {};
    const needFallback = type === 'movie' && !(omdb.imdb && omdb.rottenTomatoes);
    const js: TitleFacts['scores'] = needFallback ? await fromJellyseerrRatings(type, id) : {};
    Object.assign(scores, js, omdb);
    if (js.rottenTomatoes && omdb.rottenTomatoes) scores.rottenTomatoes = { ...js.rottenTomatoes, ...omdb.rottenTomatoes };

    return {
      title: d.title || d.name || '',
      tagline: d.tagline || null,
      overview: d.overview || null,
      runtime: num(type === 'movie' ? d.runtime : d.episodeRunTime?.[0]),
      genres: (d.genres || []).map((g: { name: string }) => g.name).slice(0, 4),
      director: directors.length ? directors.slice(0, 2).join(', ') : null,
      creators: type === 'tv' && d.createdBy ? d.createdBy.map((c: { name: string }) => c.name).slice(0, 3) : null,
      cast: (d.credits?.cast || []).slice(0, 5).map((c: { name: string }) => c.name),
      seasons: type === 'tv' ? num(d.numberOfSeasons) : null,
      scores,
    };
  } catch (err) {
    console.error('[title-facts]', (err as Error).message);
    return null;
  }
}

export function getTitleFacts(type: 'movie' | 'tv', id: number): Promise<TitleFacts | null> {
  const key = `${type}-${id}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.data);
  let p = inflight.get(key);
  if (!p) {
    p = lookup(type, id)
      .then((facts) => {
        cache.set(key, { data: facts, expiresAt: Date.now() + (facts ? TTL_OK : TTL_MISS) });
        return facts;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/**
 * One line of scores for link previews. The long form suits a text description
 * ("IMDb 7.8/10 · Rotten Tomatoes 88% · Metacritic 70 · TMDB 7.6/10"); `short` fits the preview image
 * ("IMDb 7.8 · RT 88% · MC 70").
 */
export function scoreLine(s: TitleFacts['scores'], short = false): string {
  const out: string[] = [];
  if (s.imdb) out.push(short ? `IMDb ${s.imdb.value.toFixed(1)}` : `IMDb ${s.imdb.value.toFixed(1)}/10`);
  if (s.rottenTomatoes?.critics != null) out.push(`${short ? 'RT' : 'Rotten Tomatoes'} ${Math.round(s.rottenTomatoes.critics)}%`);
  if (s.metacritic) out.push(`${short ? 'MC' : 'Metacritic'} ${Math.round(s.metacritic.value)}`);
  if (s.tmdb) out.push(short ? `TMDB ${s.tmdb.value.toFixed(1)}` : `TMDB ${s.tmdb.value.toFixed(1)}/10`);
  return (short ? out.slice(0, 3) : out).join(' · ');
}
