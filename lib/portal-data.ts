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
  direction: 'out' | 'in';
  reason: string;
  reasonEn: string | null;
}

export interface PortalFilm {
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  poster: string | null;
  jellyfinId: string | null;
  count: number;
  refScore: number;
  refs: PortalRef[];
}

export type IndexRow = [number, string, string, number | null, number];

/** Warna jenis hubungan (CSS var), dipakai penanda kecil di daftar & caption. */
export const REL_VAR: Record<string, string> = {
  homage: 'var(--rel-homage)',
  inspired: 'var(--rel-inspired)',
  visual: 'var(--rel-visual)',
  remake: 'var(--rel-remake)',
  universe: 'var(--rel-universe)',
  director: 'var(--rel-director)',
  talent: 'var(--rel-talent)',
};

/** Warna di panggung 3D (latar gelap). */
export const REL_COLOR: Record<string, string> = {
  homage: '#f7941d',
  inspired: '#4f8ff0',
  visual: '#d9d4c4',
  remake: '#34c3a0',
  universe: '#9aa3b5',
  director: '#c77dff',
  talent: '#ff6b8b',
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
