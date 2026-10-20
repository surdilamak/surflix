/**
 * Jellyfin API Client — pure HTTP (no library, konsisten sama lib/telegram.ts)
 *
 * Sumber kebenaran "film ini ada di library atau nggak" buat fitur Film Connections.
 * Sengaja pakai Jellyfin langsung, bukan Jellyseerr /media (API key Jellyseerr
 * user-level, lihat known issue #1 di CLAUDE.md).
 *
 * Header auth: X-Emby-Token
 */

const CACHE_TTL_MS = 10 * 60 * 1000;

export type JellyfinMediaType = 'movie' | 'tv';

interface JellyfinItem {
  Id: string;
  Type: 'Movie' | 'Series' | string;
  ProviderIds?: Record<string, string>;
}

// tmdbId bisa bentrok antara movie & tv, jadi key-nya "<mediaType>:<tmdbId>"
export type LibraryTmdbMap = Map<string, string>;

export function libraryKey(mediaType: JellyfinMediaType, tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}

let cache: { map: LibraryTmdbMap; expiresAt: number } | null = null;
let inflight: Promise<LibraryTmdbMap> | null = null;

function isConfigured() {
  return !!(process.env.JELLYFIN_URL && process.env.JELLYFIN_API_KEY);
}

async function fetchLibrary(): Promise<LibraryTmdbMap> {
  if (!isConfigured()) {
    throw new Error('JELLYFIN_URL / JELLYFIN_API_KEY belum di-set');
  }

  const base = process.env.JELLYFIN_URL!.replace(/\/+$/, '');
  const url =
    `${base}/Items?Recursive=true&IncludeItemTypes=Movie,Series` +
    `&Fields=ProviderIds&HasTmdbId=true`;

  const res = await fetch(url, {
    headers: { 'X-Emby-Token': process.env.JELLYFIN_API_KEY! },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    console.error('[Jellyfin] /Items failed:', res.status);
    throw new Error(`Jellyfin API error ${res.status}`);
  }

  const data = await res.json();
  const items: JellyfinItem[] = data?.Items ?? [];

  const map: LibraryTmdbMap = new Map();
  for (const item of items) {
    const tmdbId = parseInt(item.ProviderIds?.Tmdb ?? '', 10);
    if (!Number.isFinite(tmdbId)) continue;
    const mediaType: JellyfinMediaType | null =
      item.Type === 'Movie' ? 'movie' : item.Type === 'Series' ? 'tv' : null;
    if (!mediaType) continue;
    map.set(libraryKey(mediaType, tmdbId), item.Id);
  }
  return map;
}

/**
 * Map library Jellyfin: "<mediaType>:<tmdbId>" -> jellyfinItemId.
 * Di-cache 10 menit (in-memory); request paralel share satu fetch.
 */
export async function getLibraryTmdbMap(): Promise<LibraryTmdbMap> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;
  if (inflight) return inflight;

  inflight = fetchLibrary()
    .then((map) => {
      cache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
      return map;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Lookup satu film. Return jellyfinItemId, atau null kalau gak ada di library.
 */
export async function findJellyfinId(
  mediaType: JellyfinMediaType,
  tmdbId: number
): Promise<string | null> {
  const map = await getLibraryTmdbMap();
  return map.get(libraryKey(mediaType, tmdbId)) ?? null;
}

/**
 * Deep-link nonton di Jellyfin web (whitelabel).
 * TODO: confirm route `/web/#/details?id=` di instance whitelabel.
 * baseUrl opsional — client pass dari useAppConfig, server fallback ke env.
 */
export function watchUrl(jellyfinItemId: string, baseUrl?: string): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_JELLYFIN_URL || '').replace(/\/+$/, '');
  return `${base}/web/#/details?id=${encodeURIComponent(jellyfinItemId)}`;
}
