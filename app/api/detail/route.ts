/**
 * GET /api/detail?type=movie&id=12345
 *
 * Detailed metadata dari Jellyseerr getMediaDetail.
 * Includes: Director, Cast, Genres, Runtime, Production, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jellyseerr } from '@/lib/jellyseerr';

// In-memory cache per item
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id || (type !== 'movie' && type !== 'tv')) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const key = `${type}-${id}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const detail = await jellyseerr.getMediaDetail(type as 'movie' | 'tv', parseInt(id));

    // Extract director from credits.crew
    let director: string | null = null;
    if (detail.credits?.crew) {
      const directors = detail.credits.crew
        .filter((c: any) => c.job === 'Director' || c.job === 'Series Director')
        .map((c: any) => c.name);
      if (directors.length > 0) {
        director = directors.slice(0, 2).join(', ');
      }
    }

    // For TV series, get creators (TV doesn't have directors per se)
    let creators: string[] | null = null;
    if (type === 'tv' && detail.createdBy) {
      creators = detail.createdBy.map((c: any) => c.name).slice(0, 3);
    }

    // Top 5 cast
    const cast = (detail.credits?.cast || []).slice(0, 5).map((c: any) => ({
      name: c.name,
      character: c.character,
      profilePath: c.profilePath,
    }));

    // Genres
    const genres = (detail.genres || []).map((g: any) => g.name);

    // Production companies (limit 3)
    const productionCompanies = (detail.productionCompanies || []).slice(0, 3).map((c: any) => c.name);

    // Networks (for TV)
    const networks = type === 'tv' ? (detail.networks || []).slice(0, 3).map((n: any) => n.name) : [];

    // Runtime
    const runtime = type === 'movie' ? detail.runtime : detail.episodeRunTime?.[0];

    const response = {
      id: detail.id,
      mediaType: type,
      title: detail.title || detail.name,
      tagline: detail.tagline,
      overview: detail.overview,
      posterPath: detail.posterPath,
      backdropPath: detail.backdropPath,
      releaseDate: detail.releaseDate || detail.firstAirDate,
      voteAverage: detail.voteAverage,
      voteCount: detail.voteCount,
      runtime,
      director,
      creators,
      cast,
      genres,
      productionCompanies,
      networks,
      // TV-specific
      numberOfSeasons: detail.numberOfSeasons,
      numberOfEpisodes: detail.numberOfEpisodes,
      status: detail.status,
      // Surflix-specific
      mediaInfo: detail.mediaInfo,
    };

    cache.set(key, { data: response, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[Detail API] Error:', err.message);
    return NextResponse.json({ error: 'Gagal load detail' }, { status: 500 });
  }
}
