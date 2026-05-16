/**
 * GET /api/search?q=...
 *
 * Smart search proxy ke Jellyseerr.
 *
 * Parses query untuk auto-detect:
 * - Year (4-digit) → filter results by release/air date
 * - Person name → expand person hits ke filmography mereka (director, actor)
 *
 * Examples:
 * - "inception 2010"           → movies titled "inception" released 2010
 * - "christopher nolan"        → movies/TV where Nolan is in cast OR crew
 * - "christopher nolan 2014"   → Nolan's filmography filtered to 2014 (Interstellar)
 * - "2024"                     → recent movies/TV (year-only fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { jellyseerr, JellyseerrMediaItem } from '@/lib/jellyseerr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Max persons we expand (1 expand = 1 extra API call, latency tradeoff)
const PERSON_EXPAND_LIMIT = 2;

// Max combined results returned (prevents huge filmography blobs)
const RESULT_LIMIT = 60;

function extractYear(query: string): { year: number | null; rest: string } {
  // Match 4-digit year — bounded so we don't catch e.g. "2007 Astro Boy" as part of title
  const match = query.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return { year: null, rest: query };
  const year = parseInt(match[1], 10);
  const rest = query.replace(match[0], '').replace(/\s+/g, ' ').trim();
  return { year, rest };
}

function getItemYear(item: JellyseerrMediaItem): number | null {
  const date = item.releaseDate || item.firstAirDate;
  if (!date) return null;
  const y = parseInt(date.split('-')[0], 10);
  return isNaN(y) ? null : y;
}

function itemKey(item: JellyseerrMediaItem): string {
  return `${item.mediaType}:${item.id}`;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);

  const limit = await checkRateLimit({
    ipAddress: ip,
    endpoint: 'search',
    max: 60,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many searches. Coba lagi nanti.' },
      { status: 429, headers: { 'X-RateLimit-Reset': limit.resetAt.toISOString() } }
    );
  }

  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('q')?.trim() || '';
  const page = parseInt(searchParams.get('page') || '1');

  if (rawQuery.length < 2) {
    return NextResponse.json({ error: 'Query min 2 karakter' }, { status: 400 });
  }

  const { year, rest } = extractYear(rawQuery);
  const titleQuery = rest;

  try {
    // Year-only query (e.g. "2024") → fallback ke discover dengan year filter
    if (year && !titleQuery) {
      const [movies, tv] = await Promise.all([
        jellyseerr.discoverMovies({ year, page }),
        jellyseerr.discoverTv({ year, page }),
      ]);
      const merged = [...movies.results, ...tv.results].slice(0, RESULT_LIMIT);
      return NextResponse.json({
        results: merged,
        page,
        totalPages: Math.max(movies.totalPages, tv.totalPages),
      });
    }

    // Otherwise: hit search with the non-year portion of the query
    const data = await jellyseerr.search(titleQuery || rawQuery, page);

    const media: JellyseerrMediaItem[] = [];
    const persons: JellyseerrMediaItem[] = [];
    for (const item of data.results) {
      if (item.mediaType === 'movie' || item.mediaType === 'tv') media.push(item);
      else if (item.mediaType === 'person') persons.push(item);
    }

    // Expand person hits — fetch each top person's combined credits, treat
    // their cast + crew filmography as additional search results.
    const personFilms: JellyseerrMediaItem[] = [];
    if (persons.length > 0) {
      const topPersons = persons.slice(0, PERSON_EXPAND_LIMIT);
      const creditResults = await Promise.all(
        topPersons.map((p) =>
          jellyseerr.getPersonCombinedCredits(p.id).catch(() => null)
        )
      );
      for (const credits of creditResults) {
        if (!credits) continue;
        if (credits.cast) personFilms.push(...credits.cast);
        if (credits.crew) personFilms.push(...credits.crew);
      }
    }

    // Dedupe by mediaType+id (a film can appear in both search and credits)
    const seen = new Set<string>();
    let merged: JellyseerrMediaItem[] = [];
    for (const item of [...media, ...personFilms]) {
      if (item.mediaType !== 'movie' && item.mediaType !== 'tv') continue;
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    // Year filter (if year was detected in query)
    if (year) {
      merged = merged.filter((item) => getItemYear(item) === year);
    }

    // Sort by vote count (more reviews = more notable), fallback to vote average
    merged.sort((a, b) => {
      const aScore = (a.voteCount || 0) * 10 + (a.voteAverage || 0);
      const bScore = (b.voteCount || 0) * 10 + (b.voteAverage || 0);
      return bScore - aScore;
    });

    return NextResponse.json({
      results: merged.slice(0, RESULT_LIMIT),
      page: data.page,
      totalPages: data.totalPages,
    });
  } catch (err: any) {
    console.error('[Search API] Error:', err.message);
    return NextResponse.json(
      { error: 'Gagal search. Coba lagi sebentar.' },
      { status: 500 }
    );
  }
}
