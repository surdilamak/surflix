/**
 * Jellyfin API Client — pure HTTP (no library, consistent with lib/telegram.ts)
 *
 * Source of truth for "is this film in the library or not" for the Film Connections feature.
 * Deliberately uses Jellyfin directly, not Jellyseerr /media (the Jellyseerr API key is
 * user-level, see known issue #1 in CLAUDE.md).
 *
 * Header auth: Authorization: MediaBrowser Token="<JELLYFIN_API_KEY>"
 */

const CACHE_TTL_MS = 10 * 60 * 1000;

export type JellyfinMediaType = 'movie' | 'tv';

interface JellyfinItem {
  Id: string;
  Type: 'Movie' | 'Series' | string;
  ProviderIds?: Record<string, string>;
}

// tmdbId can collide between movie & tv, so the key is "<mediaType>:<tmdbId>"
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
    // Jellyfin 12 rejects X-Emby-Token (401); MediaBrowser Authorization works on 10.8+ too
    headers: { Authorization: `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"` },
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
 * Cached for 10 minutes (in-memory); parallel requests share one fetch.
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
 * Look up one film. Returns jellyfinItemId, or null if it is not in the library.
 */
export async function findJellyfinId(
  mediaType: JellyfinMediaType,
  tmdbId: number
): Promise<string | null> {
  const map = await getLibraryTmdbMap();
  return map.get(libraryKey(mediaType, tmdbId)) ?? null;
}

let serverIdCache: string | null = null;

/**
 * Jellyfin server ID (needed by the web client deep-link: without serverId, Jellyfin 10.9+/12
 * cannot determine the server and falls back to the home page).
 * Urutan: env JELLYFIN_SERVER_ID -> /System/Info/Public (public endpoint, no auth).
 */
export async function getServerId(): Promise<string> {
  if (process.env.JELLYFIN_SERVER_ID) return process.env.JELLYFIN_SERVER_ID;
  if (serverIdCache) return serverIdCache;

  const bases = [process.env.JELLYFIN_URL, process.env.NEXT_PUBLIC_JELLYFIN_URL].filter(Boolean) as string[];
  for (const base of bases) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/System/Info/Public`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const id = (await res.json())?.Id;
      if (id) return (serverIdCache = id);
    } catch {
      // try the next base
    }
  }
  return '';
}

/**
 * Watch deep-link in the Jellyfin web (whitelabel). Same format as the one Jellyfin
 * itself builds: #/details?id=<itemId>&serverId=<serverId>.
 * baseUrl & serverId are sent from the client (see /api/config); the server falls back to env.
 */
export function watchUrl(jellyfinItemId: string, baseUrl?: string, serverId?: string): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_JELLYFIN_URL || '').replace(/\/+$/, '');
  const sid = serverId ? `&serverId=${encodeURIComponent(serverId)}` : '';
  return `${base}/web/#/details?id=${encodeURIComponent(jellyfinItemId)}${sid}`;
}

/**
 * Poster URL (Primary image) of a Jellyfin item. The image endpoint is public & CORS-enabled.
 */
export function posterUrl(jellyfinItemId: string, baseUrl: string, maxWidth = 342): string {
  return `${baseUrl.replace(/\/+$/, '')}/Items/${encodeURIComponent(jellyfinItemId)}/Images/Primary?maxWidth=${maxWidth}`;
}
