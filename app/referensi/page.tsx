/**
 * Portal Referensi — daftar film yang punya peta referensi
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { useAppConfig } from '@/lib/hooks/use-app-config';
import { usePortal } from '@/lib/hooks/use-portal';

interface ConnectedFilm {
  tmdbId: number;
  mediaType: string;
  title: string;
  count: number;
  year: number | null;
  poster: string | null;
  jellyfinId: string | null;
}

export default function ReferensiHomePage() {
  const config = useAppConfig();
  const { portalPath } = usePortal();
  const [films, setFilms] = useState<ConnectedFilm[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch('/api/connections/films')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setFilms(d.films))
      .catch(() => setError(true));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (films ?? []).filter((f) => !term || f.title.toLowerCase().includes(term));
  }, [films, q]);

  function posterOf(f: ConnectedFilm): string | null {
    if (f.poster) return `https://image.tmdb.org/t/p/w342${f.poster}`;
    if (f.jellyfinId && config?.jellyfinUrl) {
      return `${config.jellyfinUrl.replace(/\/+$/, '')}/Items/${f.jellyfinId}/Images/Primary?maxWidth=342`;
    }
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tighter md:text-3xl">Peta referensi film</h1>
        <p className="mt-1 text-sm text-white/60">
          Film yang saling nyambung lewat homage, inspirasi, dan referensi visual. Semua bisa ditonton di Surflix.
        </p>
      </div>

      <div className="relative mb-6">
        <Icons.Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari film…"
          className="input-ios w-full pl-10 text-sm"
        />
      </div>

      {error ? (
        <p className="py-16 text-center text-sm text-white/50">Gagal memuat daftar film. Coba refresh.</p>
      ) : films === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-ios-lg bg-white/[0.04]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-white/50">
          {films.length === 0 ? 'Belum ada peta referensi.' : 'Film gak ketemu.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {filtered.map((f) => {
            const src = posterOf(f);
            return (
              <a
                key={`${f.mediaType}-${f.tmdbId}`}
                href={portalPath(`/${f.mediaType}/${f.tmdbId}`)}
                className="group block"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-ios-lg bg-bg-surface transition-transform group-hover:scale-[1.03]">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={f.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-red-900/40">
                      <Icons.Film className="h-8 w-8 text-white/30" />
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    {f.count} referensi
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-tight">{f.title}</p>
                {f.year && <p className="text-[11px] text-white/50">{f.year}</p>}
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
