/**
 * Tipe & helper data portal Referensi (client-safe).
 */
import { posterUrl } from '@/lib/jellyfin';

export interface PortalRef {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  poster: string | null;
  jellyfinId: string | null;
  relationship: string;
  reason: string;
}

export interface PortalFilm {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  poster: string | null;
  jellyfinId: string | null;
  count: number;
  refs: PortalRef[];
}

export const REL_LABEL: Record<string, string> = {
  homage: 'Homage',
  inspired: 'Terinspirasi',
  visual: 'Referensi visual',
};

export const REL_VAR: Record<string, string> = {
  homage: 'var(--rel-homage)',
  inspired: 'var(--rel-inspired)',
  visual: 'var(--rel-visual)',
};

export const filmKey = (mediaType: string, tmdbId: number) => `${mediaType}:${tmdbId}`;

/** Poster TMDB kalau ada, kalau nggak gambar Primary dari Jellyfin. */
export function posterOf(
  f: { poster?: string | null; jellyfinId?: string | null },
  jellyfinUrl: string | undefined,
  width = 342
): string | null {
  if (f.poster) return `https://image.tmdb.org/t/p/w${width > 342 ? 500 : 342}${f.poster}`;
  if (f.jellyfinId && jellyfinUrl) return posterUrl(f.jellyfinId, jellyfinUrl, width);
  return null;
}
