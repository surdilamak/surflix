/**
 * Sync snapshot library Jellyfin -> tabel LibraryTitle.
 *
 * Nama file di Jellyfin sering kotor (release group, resolusi). Kalau Name kelihatan kotor,
 * pakai nama folder (tanpa "(tahun)"), lalu OriginalTitle sebagai cadangan.
 * Butuh JELLYFIN_URL + JELLYFIN_API_KEY di server.
 */

import { prisma } from '@/lib/db';

const DIRTY = /\.(mkv|mp4)|1080p|BluRay|WEB-?DL|WEBRip|x26[45]|MIRCrew|PSArips|Encoded|Dolby|GalaxyRG|RMZ|RARBG|YAWN|\[|\{|\(\d{4}\)|^[A-Za-z0-9]+(\.[A-Za-z0-9]+){3,}/i;

interface JfItem {
  Id: string;
  Name: string;
  OriginalTitle?: string;
  Type: string;
  Path?: string;
  ProductionYear?: number;
  Genres?: string[];
  ProviderIds?: Record<string, string>;
  People?: Array<{ Name: string; Type: string }>;
}

export function cleanTitle(item: JfItem): string {
  let title = item.Name;
  if (DIRTY.test(title)) {
    const folder = (item.Path || '').split('/').slice(-2, -1)[0] || '';
    const f = folder.replace(/\s*\(\d{4}\)\s*$/, '').replace(/\.\d{4}$/, '').trim();
    title = (f && !DIRTY.test(f) ? f : null) || item.OriginalTitle || title;
  }
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

export async function syncLibraryFromJellyfin() {
  const base = process.env.JELLYFIN_URL?.replace(/\/+$/, '');
  const key = process.env.JELLYFIN_API_KEY;
  if (!base || !key) throw new Error('JELLYFIN_URL / JELLYFIN_API_KEY belum di-set di server');

  const url =
    `${base}/Items?Recursive=true&IncludeItemTypes=Movie,Series&HasTmdbId=true` +
    `&Fields=ProviderIds,ProductionYear,Genres,OriginalTitle,Path,People`;
  const res = await fetch(url, {
    headers: { Authorization: `MediaBrowser Token="${key}"` },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Jellyfin API error ${res.status}`);
  const items: JfItem[] = (await res.json())?.Items ?? [];

  let created = 0;
  let updated = 0;
  const seen = new Set<string>();
  for (const i of items) {
    const tmdbId = parseInt(i.ProviderIds?.Tmdb ?? '', 10);
    const mediaType = i.Type === 'Movie' ? 'movie' : i.Type === 'Series' ? 'tv' : null;
    if (!tmdbId || !mediaType) continue;
    const k = `${mediaType}:${tmdbId}`;
    if (seen.has(k)) continue;
    seen.add(k);

    const title = cleanTitle(i);
    const data = {
      title,
      originalTitle: i.OriginalTitle && i.OriginalTitle !== title ? i.OriginalTitle : null,
      year: i.ProductionYear ?? null,
      jellyfinId: i.Id,
      genres: (i.Genres ?? []).join(', ') || null,
      directors: (i.People ?? []).filter((p) => p.Type === 'Director').map((p) => p.Name).slice(0, 3).join(', ') || null,
    };
    const where = { tmdbId_mediaType: { tmdbId, mediaType } };
    const had = await prisma.libraryTitle.findUnique({ where });
    await prisma.libraryTitle.upsert({ where, create: { tmdbId, mediaType, ...data }, update: data });
    had ? updated++ : created++;
  }

  return { total: seen.size, created, updated };
}

// ── Auto-sync (dipicu webhook Jellyseerr MEDIA_AVAILABLE) ──────────────────────
// Serial bisa nembak banyak event beruntun, jadi digabung: satu sync per jendela
// debounce. State ada di memori proses (cukup: container ini satu proses Node).
const SYNC_DEBOUNCE_MS = 30_000;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncRunning = false;
let syncAgain = false;

async function runScheduledSync() {
  if (syncRunning) {
    syncAgain = true; // ada event baru pas sync jalan: ulang sekali setelah selesai
    return;
  }
  syncRunning = true;
  try {
    const r = await syncLibraryFromJellyfin();
    await prisma.eventLog.create({ data: { type: 'library.autosync', payload: JSON.stringify(r) } });
    console.log(`[LibrarySync] auto-sync: ${r.created} baru, ${r.updated} diupdate (total ${r.total})`);
  } catch (err) {
    console.warn('[LibrarySync] auto-sync gagal:', (err as Error).message);
  } finally {
    syncRunning = false;
    if (syncAgain) {
      syncAgain = false;
      scheduleLibrarySync();
    }
  }
}

/** Jadwalkan sync library (debounce). Aman dipanggil berkali-kali; tidak pernah throw. */
export function scheduleLibrarySync() {
  if (!process.env.JELLYFIN_URL || !process.env.JELLYFIN_API_KEY) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void runScheduledSync();
  }, SYNC_DEBOUNCE_MS);
}
